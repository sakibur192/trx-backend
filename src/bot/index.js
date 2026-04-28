const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ======================
// CONFIG
// ======================
const TOKEN = "8595998350:AAGQf-51yj0e6BqpHyheDNCq2I_wBfZEf8I"; // ⚠️ move to env later
const API = "http://187.127.145.228:4000";
const GROUP_ID = -1003923871636;

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 Bot is running...");

// ======================
// INLINE MAIN MENU
// ======================
const sendMainMenu = async (chatId) => {
  return bot.sendMessage(chatId, "💰 *Main Menu*\nChoose an option:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 Deposit", callback_data: "deposit" },
          { text: "💸 Withdraw", callback_data: "withdraw" }
        ],
        [
          { text: "🆘 Support", callback_data: "support" }
        ]
      ]
    }
  });
};

// ======================
// GROUP MENU (CLEAN VERSION)
// ======================
const sendGroupMenu = async () => {
  try {
    await bot.sendMessage(GROUP_ID, "💰 *System Menu*", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💰 Deposit", callback_data: "deposit" },
            { text: "💸 Withdraw", callback_data: "withdraw" }
          ],
          [
            { text: "🆘 Support", callback_data: "support" }
          ]
        ]
      }
    });


        await bot.pinChatMessage(GROUP_ID, msg.message_id);

    console.log("📌 Group menu sent");
  } catch (err) {
    console.log("Menu error:", err.message);
  }
};

sendGroupMenu();

// ======================
// HANDLE INLINE BUTTONS
// ======================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  if (data === "deposit") {
    return bot.sendMessage(chatId,
      "💰 Deposit Mode\n\nSend:\nTRX_ID AMOUNT SENDER\n\nExample:\nTRX123 500 bKash"
    );
  }

  if (data === "withdraw") {
    return bot.sendMessage(chatId,
      "💸 Withdraw Mode\n\nSend:\nAMOUNT METHOD ACCOUNT\n\nExample:\n500 bkash 017XXXXXXXX"
    );
  }

  if (data === "support") {
    return bot.sendMessage(chatId,
      "🆘 Support: Contact admin @your_username"
    );
  }
});

// ======================
// START COMMAND
// ======================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await sendMainMenu(chatId);
});

// ======================
// HANDLE MESSAGES
// ======================
bot.on('message', async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (!text || text.startsWith('/')) return;

  const parts = text.trim().split(' ');

  // ======================
  // DEPOSIT FLOW (FIXED)
  // ======================
  if (parts.length === 3) {
    const [trx_id, amount, sender] = parts;

    // better validation
    if (!trx_id || !amount || !sender) return;

    try {
      const res = await axios.post(`${API}/db/transaction`, {
        trx_id,
        amount,
        sender,
        user_id: chatId,
        player_id: chatId,
        source: "telegram"
      });

      if (res.data.status === "duplicate") {
        return bot.sendMessage(chatId, "❌ Duplicate TRX detected");
      }

      return bot.sendMessage(chatId, "⏳ Deposit received. Processing...");
    } catch (err) {
      return bot.sendMessage(chatId, "❌ Server error");
    }
  }

  // ======================
  // WITHDRAW FLOW
  // ======================
  if (parts.length === 3) {
    const [amount, method, account_number] = parts;

    try {
      await axios.post(`${API}/withdraw/create`, {
        user_id: chatId,
        amount,
        method,
        account_number
      });

      return bot.sendMessage(chatId, "💸 Withdraw request submitted");
    } catch (err) {
      return bot.sendMessage(chatId, "❌ Withdraw failed");
    }
  }
});

module.exports = bot;