const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ======================
// CONFIG
// ======================
const TOKEN = "YOUR_BOT_TOKEN"; // replace this
const API = "http://localhost:4000"; // backend API
const GROUP_ID = -100xxxxxxxxxx; // your group id

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 Bot is running...");

// ======================
// SEND GROUP MENU (ON START)
// ======================
const sendGroupMenu = async () => {
  try {
    await bot.sendMessage(GROUP_ID, "💰 Welcome to System", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "💰 Deposit",
              url: "https://t.me/YOUR_BOT?start=deposit"
            },
            {
              text: "💸 Withdraw",
              url: "https://t.me/YOUR_BOT?start=withdraw"
            }
          ],
          [
            {
              text: "🆘 Support",
              url: "https://t.me/YOUR_BOT?start=support"
            }
          ]
        ]
      }
    });

    console.log("📌 Group menu sent");
  } catch (err) {
    console.log("Menu error:", err.message);
  }
};

// run once
sendGroupMenu();

// ======================
// HANDLE /start COMMANDS
// ======================
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const param = match?.[1];

  if (!param) {
    return bot.sendMessage(chatId, "👋 Welcome! Use group buttons.");
  }

  if (param === "deposit") {
    return bot.sendMessage(chatId,
      "💰 Deposit Mode\n\nSend:\nTRX_ID AMOUNT SENDER\n\nExample:\nTRX123 500 bKash"
    );
  }

  if (param === "withdraw") {
    return bot.sendMessage(chatId,
      "💸 Withdraw Mode\n\nSend:\nAMOUNT METHOD ACCOUNT\n\nExample:\n500 bkash 017XXXXXXXX"
    );
  }

  if (param === "support") {
    return bot.sendMessage(chatId,
      "🆘 Support:\nContact admin @your_username"
    );
  }
});

// ======================
// HANDLE USER MESSAGES
// ======================
bot.on('message', async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (!text || text.startsWith('/')) return;

  const parts = text.split(' ');

  // ======================
  // DEPOSIT FLOW
  // ======================
  if (parts.length === 3 && isNaN(parts[0]) === false) {
    const [trx_id, amount, sender] = parts;

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