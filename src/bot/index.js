const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const db = require('../db'); 

// ======================
// CONFIG
// ======================
const TOKEN = "8595998350:AAGQf-51yj0e6BqpHyheDNCq2I_wBfZEf8I";
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
        console.log("✅ Render Postgres Ready.");
    } catch (err) { console.error("❌ DB Init Error:", err.message); }
};
initDB();

// ======================
// CORE LOGIC: RETRY ENGINE
// ======================
async function startVerificationRetry(chatId, data) {
    const { trx_id, amount, last3, playerId, method } = data;

    // Notify Group
    const displayNum = last3 ? `****${last3}` : "Screenshot";
    bot.sendMessage(GROUP_ID, `🔔 *Deposit Initiated*\n👤 ID: \`${playerId}\`\n💰 Amt: ${amount}\n📱 Num: ${displayNum}`, { parse_mode: "Markdown" });

    // Admin Notification
    const adminMsg = await bot.sendMessage(ADMIN_ID, 
        `⏳ *Searching SMS... (Attempt 1/5)*\nID: ${playerId}\nTRX: ${trx_id || 'Waiting'}\nAmt: ${amount}`, 
        { parse_mode: "Markdown" }
    );

    let match = null;
    for (let i = 1; i <= 5; i++) {
        if (i > 1) {
            bot.editMessageText(`⏳ *Searching SMS... (Attempt ${i}/5)*\nID: ${playerId}\nTRX: ${trx_id || 'Waiting'}`, 
            { chat_id: ADMIN_ID, message_id: adminMsg.message_id });
        }

        const res = await db.query(
            "SELECT * FROM sms_data WHERE (trx_id = $1 OR sender LIKE $2) AND amount = $3 LIMIT 1",
            [trx_id, `%${last3}`, amount]
        );

        if (res.rows.length > 0) {
            match = res.rows[0];
            break;
        }
        if (i < 5) await sleep(60000); 
    }

    const finalTrx = match ? match.trx_id : (trx_id || "NOT_FOUND");
    const senderFull = match ? match.sender : (last3 ? `Manual-${last3}` : "Manual-Entry");
    const statusHeader = match ? "✅ *MATCH FOUND*" : "❌ *NOT FOUND (TIMEOUT)*";

    bot.editMessageText(`${statusHeader}\nID: ${playerId}\nTRX: ${finalTrx}\nAmt: ${amount}\n📱 Sender: ${senderFull}`, {
        chat_id: ADMIN_ID,
        message_id: adminMsg.message_id,
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ SEND..OK", callback_data: `approve_${chatId}_${finalTrx}_${playerId}_${senderFull}` }],
                [{ text: "❌ REJECT", callback_data: `reject_${chatId}_${playerId}` }]
            ]
        }
    });

    await db.query(
        "INSERT INTO deposit_history (user_id, player_id, trx_id, amount, sender_number, method, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [chatId, playerId, finalTrx, amount, senderFull, method, match ? 'verified' : 'not_found']
    );

    if (!match) bot.sendMessage(chatId, "❌ Transaction not found after 5 minutes. Support notified.");
}

// ======================
// CALLBACK HANDLERS
// ======================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("approve_")) {
        const [_, userId, trxId, pId, sNum] = data.split("_");
        await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        bot.sendMessage(userId, "✅ *Deposit Successful!* Balance updated.", { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `✅ *Deposit Success*\n🆔 ID: \`${pId}\`\n📱 Num: ${maskNumber(sNum)}\n💰 Status: Success!`, { parse_mode: "Markdown" });
        bot.editMessageText(`💰 Approved: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }

    if (data.startsWith("reject_")) {
        const [_, userId, pId] = data.split("_");
        bot.sendMessage(userId, "❌ *Deposit Rejected.* Contact support.");
        bot.editMessageText(`❌ Rejected: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }

    if (data === "dep_menu") {
        bot.editMessageText("📥 *Choose Method:*", {
            chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "📸 Screenshot", callback_data: "dep_ss" }, { text: "⌨️ Manual", callback_data: "dep_manual" }], [{ text: "⬅ Back", callback_data: "home" }]] }
        });
    }

    if (data === "dep_ss") {
        userState[chatId] = { step: 'WAITING_PHOTO' };
        bot.sendMessage(chatId, "📸 *Send your payment screenshot now:*");
    }

    if (data === "dep_manual") {
        userState[chatId] = { step: 'WAITING_MANUAL' };
        bot.sendMessage(chatId, "⌨️ *Enter:* `Last3Digits Amount PlayerID` (Ex: 556 500 1234)");
    }

    if (data === "home") {
        bot.editMessageText(`💰 *TRX WALLET APP*`, {
            chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "💰 Deposit", callback_data: "dep_menu" }, { text: "💸 Withdraw", callback_data: "withdraw" }], [{ text: "🆘 Support", callback_data: "support" }]] }
        });
    }
    bot.answerCallbackQuery(query.id);
});

// ======================
// INPUT PROCESSING (WITH FALLBACK)
// ======================
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]?.step !== 'WAITING_PHOTO') return;

    const loading = await bot.sendMessage(chatId, "⏳ *Reading Image...*", { parse_mode: "Markdown" });
    try {
        const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
        const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        const { data: { text } } = await Tesseract.recognize(url, 'ben+eng');

        const trxMatch = text.match(/(?:TrxID|ট্রানজেকশন আইডি|TxnId)[:\s]*([A-Z0-9]{8,12})/i);
        const trx = trxMatch ? trxMatch[1] : text.match(/[A-Z0-9]{8,12}/)?.[0];
        
        const amtMatches = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g);
        let amt = amtMatches ? amtMatches.find(a => !text.includes("Total") || a !== amtMatches[0]) || amtMatches[0] : null;
        if (amt) amt = amt.replace(/,/g, '');

        bot.deleteMessage(chatId, loading.message_id);

        if (trx && amt) {
            userState[chatId] = { step: 'GET_ID_SS', trx, amt };
            bot.sendMessage(chatId, `✅ *Data Scanned:*\nTRX: \`${trx}\`\nAmt: \`${amt}\`\n\n👉 Now enter your **Player ID**:`, { parse_mode: "Markdown" });
        } else {
            // FALLBACK INITIATED
            userState[chatId] = { step: 'FALLBACK_MANUAL' };
            bot.sendMessage(chatId, "⚠️ *OCR Failed to read details.*\n\nPlease enter the details manually:\nFormat: `TRXID Amount PlayerID`\nEx: `DDT8N3CI2K 3900 12345`", { parse_mode: "Markdown" });
        }
    } catch (e) { 
        bot.sendMessage(chatId, "❌ Error reading image. Please enter manually: `TRXID Amount PlayerID`.");
        userState[chatId] = { step: 'FALLBACK_MANUAL' };
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;

    const state = userState[chatId];

    // Case 1: Standard Manual (Last3Digits Amount ID)
    if (state?.step === 'WAITING_MANUAL') {
        const parts = text.split(' ');
        if (parts.length < 3) return bot.sendMessage(chatId, "Format: `Last3 Amount ID` (Ex: 123 500 9988)");
        startVerificationRetry(chatId, { last3: parts[0], amount: parts[1], playerId: parts[2], method: 'Manual' });
        delete userState[chatId];
    }

    // Case 2: Screenshot Success -> Asking for ID
    if (state?.step === 'GET_ID_SS') {
        startVerificationRetry(chatId, { trx_id: state.trx, amount: state.amt, playerId: text, method: 'Screenshot' });
        delete userState[chatId];
    }

    // Case 3: OCR Fallback (Full TRX Amount ID)
    if (state?.step === 'FALLBACK_MANUAL') {
        const parts = text.split(' ');
        if (parts.length < 3) return bot.sendMessage(chatId, "Format: `TRXID Amount ID` (Ex: DDT8N3CI2K 3900 12345)");
        startVerificationRetry(chatId, { trx_id: parts[0], amount: parts[1], playerId: parts[2], method: 'Screenshot-Fallback' });
        delete userState[chatId];
    }
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `💰 *TRX WALLET APP*`, {
        reply_markup: {
            inline_keyboard: [[{ text: "💰 Deposit", callback_data: "dep_menu" }, { text: "💸 Withdraw", callback_data: "withdraw" }], [{ text: "🆘 Support", callback_data: "support" }]]
        }
    });
});