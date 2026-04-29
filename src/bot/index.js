const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const db = require('../db'); 

// ======================
// CONFIG
// ======================
const TOKEN = "8595998350:AAGQ+51yj0e6BqpHyheDNCq2I_wBfZEf8I";
const ADMIN_ID = 8433649028; 
const GROUP_ID = -1003923871636; 

const bot = new TelegramBot(TOKEN, { polling: true });
const userState = {};
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const maskNumber = (num) => {
    if (!num || num.length < 7) return "Unknown";
    return num.substring(0, 4) + "****" + num.slice(-3);
};

// ======================
// DATABASE INITIALIZATION
// ======================
const initDB = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS sms_data (
                id SERIAL PRIMARY KEY,
                trx_id VARCHAR(100) UNIQUE NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                sender VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS deposit_history (
                id SERIAL PRIMARY KEY,
                user_id BIGINT,
                player_id VARCHAR(100),
                trx_id VARCHAR(100),
                amount NUMERIC(10, 2),
                sender_number VARCHAR(50),
                status VARCHAR(20) DEFAULT 'pending',
                method VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await db.query(query);
        console.log("✅ Database Ready.");
    } catch (err) { console.error("❌ DB Error:", err.message); }
};
initDB();

// ======================
// CORE LOGIC: 3-ATTEMPT RETRY
// ======================
async function startVerificationRetry(chatId, data) {
    const { trx_id, amount, playerId, senderNum, method } = data;

    bot.sendMessage(GROUP_ID, `🔔 *Deposit Initiated*\n👤 ID: \`${playerId}\`\n💰 Amt: ${amount}\n📱 Num: ${maskNumber(senderNum)}`, { parse_mode: "Markdown" });

    const adminMsg = await bot.sendMessage(ADMIN_ID, 
        `⏳ *Searching SMS... (Attempt 1/3)*\nID: ${playerId}\nTRX: ${trx_id}\nAmt: ${amount}\nSender: ${senderNum}`, 
        { parse_mode: "Markdown" }
    );

    let match = null;
    for (let i = 1; i <= 3; i++) {
        if (i > 1) {
            try {
                await bot.editMessageText(`⏳ *Searching SMS... (Attempt ${i}/3)*\nID: ${playerId}\nTRX: ${trx_id}`, 
                { chat_id: ADMIN_ID, message_id: adminMsg.message_id });
            } catch (e) { /* ignore edit errors */ }
        }

        const res = await db.query(
            "SELECT * FROM sms_data WHERE trx_id = $1 AND amount = $2 LIMIT 1",
            [trx_id, amount]
        );

        if (res.rows.length > 0) {
            match = res.rows[0];
            break;
        }
        if (i < 3) await sleep(60000); 
    }

    const finalTrx = match ? match.trx_id : trx_id;
    const finalSender = match ? match.sender : senderNum;
    const statusHeader = match ? "✅ *MATCH FOUND*" : "❌ *NOT FOUND (TIMEOUT)*";

    bot.sendMessage(ADMIN_ID, `${statusHeader}\nID: ${playerId}\nTRX: ${finalTrx}\nAmt: ${amount}\n📱 Sender: ${finalSender}`, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ SEND..OK", callback_data: `approve_${chatId}_${finalTrx}_${playerId}_${finalSender}` }],
                [{ text: "❌ REJECT", callback_data: `reject_${chatId}_${playerId}` }]
            ]
        }
    });

    await db.query(
        "INSERT INTO deposit_history (user_id, player_id, trx_id, amount, sender_number, method, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [chatId, playerId, finalTrx, amount, finalSender, method, match ? 'verified' : 'not_found']
    );
}

// ======================
// COMMANDS
// ======================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    delete userState[chatId]; // Clear any stuck state
    bot.sendMessage(chatId, `💰 *TRX WALLET APP*`, {
        parse_mode: "Markdown",
        reply_markup: { 
            inline_keyboard: [[{ text: "💰 Deposit", callback_data: "dep_menu" }, { text: "💸 Withdraw", callback_data: "withdraw" }]] 
        }
    });
});

// ======================
// CALLBACKS
// ======================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === "dep_ss") {
        userState[chatId] = { step: 'WAITING_PHOTO' };
        bot.sendMessage(chatId, "📸 *Send your payment screenshot now:*");
    }

    if (data === "dep_manual") {
        userState[chatId] = { step: 'M_TRX' };
        bot.sendMessage(chatId, "⌨️ *Manual Entry*\nStep 1: Enter **Transaction ID**:");
    }

    if (data === "dep_menu") {
        bot.sendMessage(chatId, "📥 *Choose Method:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "📸 Screenshot", callback_data: "dep_ss" }, { text: "⌨️ Manual", callback_data: "dep_manual" }]] }
        });
    }

    if (data.startsWith("approve_")) {
        const [_, userId, trxId, pId, sNum] = data.split("_");
        await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        bot.sendMessage(userId, "✅ *Deposit Successful!* Balance updated.", { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `✅ *Deposit Success*\n🆔 ID: \`${pId}\`\n💰 Status: Success!`, { parse_mode: "Markdown" });
    }

    if (data.startsWith("reject_")) {
        const [_, userId, pId] = data.split("_");
        bot.sendMessage(userId, "❌ *Deposit Rejected.* Contact support.");
    }

    bot.answerCallbackQuery(query.id);
});

// ======================
// PHOTO & MESSAGE LOGIC
// ======================
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]?.step !== 'WAITING_PHOTO') return;

    const loading = await bot.sendMessage(chatId, "⏳ *Reading Image...*");
    try {
        const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
        const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        const { data: { text } } = await Tesseract.recognize(url, 'ben+eng');

        const trx = text.match(/[A-Z0-9]{8,12}/)?.[0];
        const amtMatches = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g);
        let amt = amtMatches ? (amtMatches.find(a => !text.includes("Total") || a !== amtMatches[0]) || amtMatches[0]).replace(/,/g, '') : null;

        if (trx && amt) {
            userState[chatId] = { step: 'GET_ID_SS', trx, amt };
            bot.sendMessage(chatId, `✅ *Scanned:* TRX: \`${trx}\`, Amt: \`${amt}\`\n👉 Enter **Player ID**:`, { parse_mode: "Markdown" });
        } else {
            userState[chatId] = { step: 'M_TRX' };
            bot.sendMessage(chatId, "⚠️ OCR Failed. Enter **Transaction ID** manually:");
        }
    } catch (e) { 
        userState[chatId] = { step: 'M_TRX' };
        bot.sendMessage(chatId, "❌ Error. Enter **Transaction ID** manually:");
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands so they don't break the state logic
    if (!text || text.startsWith('/')) return;

    const state = userState[chatId];
    if (!state) return;

    if (state.step === 'M_TRX') {
        userState[chatId] = { ...state, step: 'M_AMT', trx: text };
        bot.sendMessage(chatId, "Step 2: Enter **Amount**:");
    } 
    else if (state.step === 'M_AMT') {
        userState[chatId] = { ...state, step: 'M_ID', amt: text };
        bot.sendMessage(chatId, "Step 3: Enter **Player ID**:");
    } 
    else if (state.step === 'M_ID') {
        userState[chatId] = { ...state, step: 'M_NUM', pId: text };
        bot.sendMessage(chatId, "Step 4: Enter **Sender Phone Number**:");
    } 
    else if (state.step === 'M_NUM') {
        const finalData = { trx_id: state.trx, amount: state.amt, playerId: state.pId, senderNum: text, method: 'Manual' };
        delete userState[chatId];
        bot.sendMessage(chatId, "⏳ Verifying... please wait.");
        startVerificationRetry(chatId, finalData);
    }
    else if (state.step === 'GET_ID_SS') {
        startVerificationRetry(chatId, { trx_id: state.trx, amount: state.amt, playerId: text, senderNum: "From Photo", method: 'Screenshot' });
        delete userState[chatId];
    }
});