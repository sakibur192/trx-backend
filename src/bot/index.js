const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const db = require('../db'); 

// ======================
// CONFIG
// ======================
const TOKEN = "8595998350:AAGHQtzHoofxzg_5mXzTZqFCu3OIciQWBuo";
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
        // Ensure table exists and has the correct columns
        await db.query(`
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
        `);
        // Force add column if table already existed without it
        await db.query(`ALTER TABLE deposit_history ADD COLUMN IF NOT EXISTS sender_number VARCHAR(50);`);
        console.log("✅ Database Ready & Schema Verified.");
    } catch (err) { console.error("❌ DB Error:", err.message); }
};
initDB();

// ======================
// CORE LOGIC: 3-ATTEMPT RETRY
// ======================
async function startVerificationRetry(chatId, data) {
    const { trx_id, amount, playerId, senderNum, method } = data;

    // 1. DUPLICATE CHECK
    const dupCheck = await db.query(
        "SELECT * FROM deposit_history WHERE trx_id = $1 AND (status = 'success' OR status = 'pending')",
        [trx_id]
    );

    if (dupCheck.rows.length > 0) {
        const dupMsg = await bot.sendMessage(chatId, "⚠️ *Duplicate Transaction!*\nThis TRX ID has already been submitted or processed.");
        bot.sendMessage(GROUP_ID, `🚫 *Duplicate Blocked*\nID: \`${playerId}\`\nTRX: \`${trx_id}\``, { parse_mode: "Markdown" });
        
        // Auto-delete user warning after 1 minute
        setTimeout(() => bot.deleteMessage(chatId, dupMsg.message_id).catch(() => {}), 60000);
        return;
    }

    // 2. INITIAL NOTIFICATION
    bot.sendMessage(GROUP_ID, `🔔 *Deposit Initiated*\n👤 ID: \`${playerId}\`\n💰 Amt: ${amount}\n📱 Num: ${maskNumber(senderNum)}`, { parse_mode: "Markdown" });

    let match = null;
    for (let i = 1; i <= 3; i++) {
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

    // 3. RESULT HANDLING
    if (!match) {
        // NOT FOUND CASE
        const nfMsg = await bot.sendMessage(chatId, "❌ *Transaction Not Found.*\nWe couldn't verify this TRX. Please check details or try again later.");
        bot.sendMessage(GROUP_ID, `❌ *Verification Failed*\nID: \`${playerId}\`\nTRX: \`${trx_id}\` (Not Found)`, { parse_mode: "Markdown" });
        
        // Auto-delete after 5 minutes
        setTimeout(() => bot.deleteMessage(chatId, nfMsg.message_id).catch(() => {}), 300000);
    } else {
        // MATCH FOUND - ASK FOR ADMIN APPROVAL
        await bot.sendMessage(chatId, "⏳ *Payment Verified!*\nPlease wait while the Admin performs the final approval.");
        bot.sendMessage(GROUP_ID, `✅ *TRX Matched*\nID: \`${playerId}\`\nStatus: Awaiting Admin Approval...`, { parse_mode: "Markdown" });

        // SEND TO ADMIN
        bot.sendMessage(ADMIN_ID, 
            `💰 *NEW DEPOSIT APPROVAL REQ*\n━━━━━━━━━━━━━━━\n👤 ID: \`${playerId}\`\n💵 Amt: ${amount}\n🔑 TRX: \`${match.trx_id}\`\n📱 Sender: ${match.sender}`, 
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ DONE", callback_data: `approve_${chatId}_${match.trx_id}_${playerId}` },
                            { text: "❌ REJECT", callback_data: `reject_${chatId}_${playerId}` }
                        ]
                    ]
                }
            }
        );

        // Record as pending in history
        await db.query(
            "INSERT INTO deposit_history (user_id, player_id, trx_id, amount, sender_number, method, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')",
            [chatId, playerId, match.trx_id, amount, match.sender, method]
        );
    }
}

// ======================
// MESSAGE HANDLER (Commands & Logic)
// ======================
// ... (Your existing Config and DB Init code)

// ======================
// UNIFIED MESSAGE HANDLER
// ======================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // 1. Check if text exists
    if (!text) return;

    // 2. FORCE START LOGIC
    if (text.toLowerCase() === '/start') {
        console.log(`[LOG] Start command triggered by ${chatId}`); // Check PM2 logs for this!
        
        // Wipe state to ensure no one is "stuck"
        delete userState[chatId]; 

        const menuOptions = {
            parse_mode: "Markdown",
            reply_markup: { 
                inline_keyboard: [
                    [{ text: "💰 Deposit", callback_data: "dep_menu" }, { text: "💸 Withdraw", callback_data: "withdraw" }]
                ] 
            }
        };

        return bot.sendMessage(chatId, `💰 *TRX WALLET APP*\nWelcome! Choose an option below:`, menuOptions)
            .catch(err => console.error("Error sending start message:", err));
    }

    // 3. Ignore all other commands starting with /
    if (text.startsWith('/')) return;

    // 4. Handle State Logic (Manual Steps)
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

// ... (Rest of your Callback and Photo logic)
// ======================
// CALLBACKS
// ======================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === "dep_menu") {
        bot.sendMessage(chatId, "📥 *Choose Method:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "📸 Screenshot", callback_data: "dep_ss" }, { text: "⌨️ Manual", callback_data: "dep_manual" }]] }
        });
    } else if (data === "dep_ss") {
        userState[chatId] = { step: 'WAITING_PHOTO' };
        bot.sendMessage(chatId, "📸 *Send your payment screenshot now:*");
    } else if (data === "dep_manual") {
        userState[chatId] = { step: 'M_TRX' };
        bot.sendMessage(chatId, "⌨️ *Manual Entry*\nStep 1: Enter **Transaction ID**:");
    } else if (data.startsWith("approve_")) {
        const [_, userId, trxId, pId, sNum] = data.split("_");
        await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        bot.sendMessage(userId, "✅ *Deposit Successful!* Balance updated.", { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `✅ *Deposit Success*\n🆔 ID: \`${pId}\`\n💰 Status: Success!`, { parse_mode: "Markdown" });
    } else if (data.startsWith("reject_")) {
        const [_, userId, pId] = data.split("_");
        bot.sendMessage(userId, "❌ *Deposit Rejected.* Contact support.");
    }





if (data.startsWith("approve_")) {
        const [_, userId, trxId, pId] = data.split("_");
        
        await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        
        bot.sendMessage(userId, "✅ *Deposit Successful!*\nYour account has been updated.", { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `💎 *Deposit Success*\n🆔 ID: \`${pId}\`\n💰 Status: Completed Successfully!`, { parse_mode: "Markdown" });
        
        bot.editMessageText(`✅ Approved: ${pId} (${trxId})`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }

    if (data.startsWith("reject_")) {
        const [_, userId, pId] = data.split("_");
        
        bot.sendMessage(userId, "❌ *Deposit Rejected.*\nYour payment verification was unsuccessful. Contact support.");
        bot.sendMessage(GROUP_ID, `⚠️ *Deposit Rejected*\n🆔 ID: \`${pId}\`\nStatus: Unsuccessful.`, { parse_mode: "Markdown" });
        
        bot.editMessageText(`❌ Rejected: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }

    bot.answerCallbackQuery(query.id);
});

// ======================
// PHOTO HANDLING
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

        bot.deleteMessage(chatId, loading.message_id);

        if (trx && amt) {
            userState[chatId] = { step: 'GET_ID_SS', trx, amt };
            bot.sendMessage(chatId, `✅ *Scanned:* TRX: \`${trx}\`, Amt: \`${amt}\`\n👉 Enter **Player ID**:`, { parse_mode: "Markdown" });
        } else {
            userState[chatId] = { step: 'M_TRX' };
            bot.sendMessage(chatId, "⚠️ OCR Failed. Enter **Transaction ID** manually:");
        }
    } catch (e) { 
        userState[chatId] = { step: 'M_TRX' };
        bot.sendMessage(chatId, "❌ OCR Error. Enter **Transaction ID** manually:");
    }
});