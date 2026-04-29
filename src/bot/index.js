const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const Tesseract = require('tesseract.js');

// ======================
// CONFIG
// ======================
const TOKEN = "8595998350:AAGQf-51yj0e6BqpHyheDNCq2I_wBfZEf8I";
const API = "http://187.127.145.228:4000";
const GROUP_ID = -1003923871636;
const ADMIN_ID = 8433649028; // ⚠️ Put your Telegram User ID here

const bot = new TelegramBot(TOKEN, { polling: true });

// State Management (Simple object to track user steps)
const userState = {};

// ======================
// UTILS
// ======================
const sendTempMessage = async (chatId, text, delay = 10000) => {
    const msg = await bot.sendMessage(chatId, text);
    setTimeout(() => bot.deleteMessage(chatId, msg.message_id).catch(() => {}), delay);
};

// ======================
// UI: MAIN MENU
// ======================
const sendMainMenu = (chatId) => {
    return bot.sendMessage(chatId, `💰 *TRX WALLET APP*\n\n━━━━━━━━━━━━━━\nSelect your action below:`, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "💰 Deposit", callback_data: "deposit_select" }, { text: "💸 Withdraw", callback_data: "withdraw" }],
                [{ text: "📊 History", callback_data: "history" }, { text: "🆘 Support", callback_data: "support" }]
            ]
        }
    });
};

// ======================
// CALLBACK HANDLERS
// ======================
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const msgId = query.message.message_id;

    await bot.answerCallbackQuery(query.id);

    if (data === "home") return sendMainMenu(chatId);

    if (data === "deposit_select") {
        return bot.editMessageText(`📥 *Deposit Options*\nSelect your preferred method:`, {
            chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📸 Screenshot", callback_data: "dep_ss" }, { text: "⌨️ Manual", callback_data: "dep_manual" }],
                    [{ text: "⬅ Back", callback_data: "home" }]
                ]
            }
        });
    }

    if (data === "dep_ss") {
        userState[chatId] = { step: 'WAITING_PHOTO' };
        return bot.sendMessage(chatId, "📸 *Please upload your Payment Screenshot.*", { parse_mode: "Markdown" });
    }

    if (data === "dep_manual") {
        userState[chatId] = { step: 'WAITING_MANUAL' };
        return bot.sendMessage(chatId, "⌨️ *Enter details as:* `Last4 Amount PlayerID`\n_Example: 5566 500 12345_", { parse_mode: "Markdown" });
    }

    // ADMIN APPROVAL ACTION
    if (data.startsWith("approve_")) {
        const [_, userId, trxId] = data.split("_");
        // Notify User
        bot.sendMessage(userId, "✅ *Deposit Successful!*\nYour ID has been credited. Thank you!", { parse_mode: "Markdown" });
        // Update Admin Message
        bot.editMessageText(`✅ Approved TRX: ${trxId}`, { chat_id: chatId, message_id: msgId });
    }
});

// ======================
// PHOTO & OCR HANDLER
// ======================
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]?.step !== 'WAITING_PHOTO') return;

    const loading = await bot.sendMessage(chatId, "🔍 *Scanning Screenshot...*", { parse_mode: "Markdown" });
    
    try {
        const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
        const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        
        const { data: { text } } = await Tesseract.recognize(url, 'eng');
        const trxMatch = text.match(/[A-Z0-9]{8,12}/); // Extracts potential TRX ID

        if (trxMatch) {
            const trxId = trxMatch[0];
            bot.deleteMessage(chatId, loading.message_id);
            userState[chatId] = { step: 'WAITING_ID_FOR_SS', trxId };
            bot.sendMessage(chatId, `✅ *TRX Found:* \`${trxId}\`\n👉 Now, please enter your **Player ID**:`, { parse_mode: "Markdown" });
        } else {
            bot.deleteMessage(chatId, loading.message_id);
            sendTempMessage(chatId, "❌ TRX ID not found. Try Manual Payment.");
        }
    } catch (err) {
        bot.sendMessage(chatId, "❌ Error reading image.");
    }
});

// ======================
// TEXT MESSAGE HANDLER
// ======================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;

    const state = userState[chatId];

    // Handle Manual Input (Last4 Amount PlayerID)
    if (state?.step === 'WAITING_MANUAL') {
        const parts = text.split(' ');
        if (parts.length !== 3) return bot.sendMessage(chatId, "❌ Invalid format. Use: `Last4 Amount ID`", { parse_mode: "Markdown" });
        
        const [last4, amount, playerId] = parts;
        processTransaction(chatId, { last4, amount, playerId, type: 'Manual' });
    }

    // Handle Player ID after Screenshot
    if (state?.step === 'WAITING_ID_FOR_SS') {
        processTransaction(chatId, { trx_id: state.trxId, playerId: text, type: 'Screenshot' });
    }
});

// ======================
// UNIFIED VERIFICATION LOGIC
// ======================
async function processTransaction(chatId, data) {
    try {
        // 1. If Manual, we look up the full TRX from your database table
        let finalTrx = data.trx_id;
        if (data.type === 'Manual') {
            const dbRes = await axios.get(`${API}/demo-deposit-requests/all`);
            const match = dbRes.data.find(t => t.sender.endsWith(data.last4) && parseFloat(t.amount) === parseFloat(data.amount));
            
            if (!match) return sendTempMessage(chatId, "❌ No matching SMS found for these details.");
            finalTrx = match.trx_id;
        }

        // 2. Submit to Admin Group/Channel for final click
        bot.sendMessage(ADMIN_ID, 
`📥 *New ${data.type} Deposit*
━━━━━━━━━━━━━━
👤 User: ${chatId}
🆔 Player ID: ${data.playerId || data.last4}
🔑 TRX: \`${finalTrx}\`
━━━━━━━━━━━━━━`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ SEND..OK", callback_data: `approve_${chatId}_${finalTrx}` },
                    { text: "❌ Reject", callback_data: `reject_${chatId}` }
                ]]
            }
        });

        bot.sendMessage(chatId, "⏳ *Transaction submitted for verification.*", { parse_mode: "Markdown" });
        delete userState[chatId];

    } catch (err) {
        bot.sendMessage(chatId, "❌ Verification failed. Server Error.");
    }
}

bot.onText(/\/start/, (msg) => sendMainMenu(msg.chat.id));