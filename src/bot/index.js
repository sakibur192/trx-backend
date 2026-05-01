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



bot.setMyCommands([
  { command: "start", description: "Start the bot" },
]);

bot.setChatMenuButton({
  type: "commands"
});





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
            CREATE TABLE IF NOT EXISTS withdraw_history (
                id SERIAL PRIMARY KEY,
                user_id BIGINT,
                player_id VARCHAR(100),
                method VARCHAR(20),
                amount NUMERIC(10, 2),
                wallet_number VARCHAR(50),
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);




        // Add this inside your initDB() function query block




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
        // bot.sendMessage(GROUP_ID, `🚫 *Duplicate Blocked*\nID: \`${playerId}\`\nTRX: \`${trx_id}\``, { parse_mode: "Markdown" });
        
        // Auto-delete user warning after 1 minute
        setTimeout(() => bot.deleteMessage(chatId, dupMsg.message_id).catch(() => {}), 60000);
        return;
    }

    // 2. INITIAL NOTIFICATION
    // bot.sendMessage(GROUP_ID, `🔔 *Deposit Initiated*\n👤 ID: \`${playerId}\`\n💰 Amt: ${amount}\n📱 Num: ${maskNumber(senderNum)}`, { parse_mode: "Markdown" });

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
        // bot.sendMessage(GROUP_ID, `❌ *Verification Failed*\nID: \`${playerId}\`\nTRX: \`${trx_id}\` (Not Found)`, { parse_mode: "Markdown" });
        
        // Auto-delete after 5 minutes
        setTimeout(() => bot.deleteMessage(chatId, nfMsg.message_id).catch(() => {}), 300000);
    } else {
        // MATCH FOUND - ASK FOR ADMIN APPROVAL
        await bot.sendMessage(chatId, "⏳ *Payment Verified!*\nPlease wait while the Admin performs the final approval.");
        bot.sendMessage(GROUP_ID, `✅ *Deposit Request submitted*\nID: \`${playerId}\`\nStatus: Awaiting Admin Approval...`, { parse_mode: "Markdown" });

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



const getMsg = async (key, fallback) => {
    try {
        const res = await db.query("SELECT value FROM bot_settings WHERE key = $1", [key]);
        return res.rows[0]?.value || fallback;
    } catch (err) {
        return fallback; // If DB fails, use hardcoded text
    }
};



// bot.on('message', async (msg) => {
//     const chatId = msg.chat.id;
//     const text = msg.text;

//     if (!text) return;

//     // 1. START COMMAND LOGIC
//     if (text.toLowerCase() === '/start') {
//         console.log(`[LOG] Start command triggered by ${chatId}`);
//         delete userState[chatId]; 

//         // Fetch Title from DB
//         const startTitle = await getMsg('main_menu_title', "💰 *TRX WALLET APP*");

//         const menuOptions = {
//             parse_mode: "Markdown",
//             reply_markup: { 
//                 inline_keyboard: [
//                     [{ text: "💰 Deposit", callback_data: "dep_menu" }, { text: "💸 Withdraw", callback_data: "withdraw" }]
//                 ] 
//             }
//         };

//         return bot.sendMessage(chatId, `${startTitle}\nWelcome! Choose an option below:`, menuOptions)
//             .catch(err => console.error("Error sending start message:", err));
//     }

//     if (text.startsWith('/')) return;

//     const state = userState[chatId];
//     if (!state) return;

//     // 2. MANUAL DEPOSIT STEPS
//     if (state.step === 'M_TRX') {
//         userState[chatId] = { ...state, step: 'M_AMT', trx: text };
//         const step2 = await getMsg('m_step_2', "Step 2: Enter **Amount**:");
//         bot.sendMessage(chatId, step2, { parse_mode: "Markdown" });
//     } 
//     else if (state.step === 'M_AMT') {
//         userState[chatId] = { ...state, step: 'M_ID', amt: text };
//         const step3 = await getMsg('m_step_3', "Step 3: Enter **Player ID**:");
//         bot.sendMessage(chatId, step3, { parse_mode: "Markdown" });
//     }  
//     else if (state.step === 'M_ID') {
//         const finalData = { trx_id: state.trx, amount: state.amt, playerId: text, senderNum: "text", method: 'Manual' };
//         delete userState[chatId];
        
//         const verifMsg = await getMsg('verifying_status', "⏳ Verifying... please wait.");
//         bot.sendMessage(chatId, verifMsg, { parse_mode: "Markdown" });
//         startVerificationRetry(chatId, finalData);
//     }

//     // 3. SCREENSHOT DEPOSIT STEP
//     else if (state.step === 'GET_ID_SS') {
//         const verifMsg = await getMsg('verifying_status', "⏳ *Verifying your payment... please wait.*");
//         bot.sendMessage(chatId, verifMsg, { parse_mode: "Markdown" });

//         startVerificationRetry(chatId, { 
//             trx_id: state.trx, 
//             amount: state.amt, 
//             playerId: text, 
//             senderNum: "From Photo", 
//             method: 'Screenshot' 
//         });

//         delete userState[chatId];
//     }

//     // 4. WITHDRAWAL STEPS
//     else if (state.step === 'W_NUM') {
//         const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
//         if (!phoneRegex.test(text.replace(/\s/g, ''))) {
//             const errFormat = await getMsg('err_invalid_format', "⚠️ *Invalid Format!*");
//             return bot.sendMessage(chatId, `${errFormat}\nEnter a valid number (e.g. 017XXXXXXXX):`, { parse_mode: "Markdown" });
//         }
//         userState[chatId] = { ...state, step: 'W_AMT', walletNum: text };
//         bot.sendMessage(chatId, "💰 Enter the **Amount** to withdraw:");
//     }
//     else if (state.step === 'W_AMT') {
//         if (isNaN(text)) return bot.sendMessage(chatId, "⚠️ Please enter a valid number for amount:");
//         userState[chatId] = { ...state, step: 'W_ID', amt: text };
//         bot.sendMessage(chatId, "🆔 Finally, enter your **Player ID**:");
//     }
//     else if (state.step === 'W_ID') {
//         const { method, walletNum, amt } = state;
//         const pId = text;
//         delete userState[chatId];

//         // Save to Database
//         await db.query(
//             "INSERT INTO withdraw_history (user_id, player_id, method, amount, wallet_number, status) VALUES ($1, $2, $3, $4, $5, 'pending')",
//             [chatId, pId, method, amt, walletNum]
//         );

//         const successMsg = await getMsg('wd_success_msg', "✅ *Withdrawal Request Submitted!*");
//         bot.sendMessage(chatId, successMsg, { parse_mode: "Markdown" });

//         // Notify Group (Masked)
//         const groupTitle = await getMsg('group_wd_req', "💸 *Withdrawal Request*");
//         bot.sendMessage(GROUP_ID, `${groupTitle}\n🆔 ID: \`${pId}\`\n🏦 Method: ${method}\n📱 Num: ${maskNumber(walletNum)}\n💰 Amt: ${amt}`, { parse_mode: "Markdown" });

//         // Notify Admin (Full)
//         const adminTitle = await getMsg('admin_wd_req', "💸 *NEW WITHDRAWAL REQUEST*");
//         bot.sendMessage(ADMIN_ID, `${adminTitle}\n👤 User: \`${chatId}\`\n🆔 Player ID: \`${pId}\`\n🏦 Method: ${method}\n📱 Num: \`${walletNum}\`\n💰 Amt: ${amt}`, {
//             parse_mode: "Markdown",
//             reply_markup: {
//                 inline_keyboard: [[
//                     { text: "✅ DONE", callback_data: `wdone_${chatId}_${pId}_${amt}` },
//                     { text: "❌ REJECT", callback_data: `wrej_${chatId}_${pId}` }
//                 ]]
//             }
//         });
//     }
// });



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
        const finalData = { trx_id: state.trx, amount: state.amt, playerId: state.pId, senderNum: "text", method: 'Manual' };
        delete userState[chatId];
        bot.sendMessage(chatId, "⏳ Verifying... please wait.");
        startVerificationRetry(chatId, finalData);
    }
    else if (state.step === 'GET_ID_SS') {
        // 1. Send the instant "Verifying" message
        bot.sendMessage(chatId, "⏳ *Verifying your payment... please wait.*", { parse_mode: "Markdown" });

        // 2. Pass the data to your verification function
        startVerificationRetry(chatId, { 
            trx_id: state.trx, 
            amount: state.amt, 
            playerId: text, 
            senderNum: "From Photo", 
            method: 'Screenshot' 
        });

        // 3. Clean up the user state
        delete userState[chatId];
    }



// --- WITHDRAW STATES (New) ---
    else if (state.step === 'W_NUM') {
        const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
        if (!phoneRegex.test(text.replace(/\s/g, ''))) {
            return bot.sendMessage(chatId, "⚠️ *Invalid Format!*\nEnter a valid number (e.g. 017XXXXXXXX):");
        }
        userState[chatId] = { ...state, step: 'W_AMT', walletNum: text };
        bot.sendMessage(chatId, "💰 Enter the **Amount** to withdraw:");
    }
    else if (state.step === 'W_AMT') {
        if (isNaN(text)) return bot.sendMessage(chatId, "⚠️ Please enter a valid number for amount:");
        userState[chatId] = { ...state, step: 'W_ID', amt: text };
        bot.sendMessage(chatId, "🆔 Finally, enter your **Player ID**:");
    }
    else if (state.step === 'W_ID') {
        const { method, walletNum, amt } = state;
        const pId = text;
        delete userState[chatId];

        // Save to Database
        await db.query(
            "INSERT INTO withdraw_history (user_id, player_id, method, amount, wallet_number, status) VALUES ($1, $2, $3, $4, $5, 'pending')",
            [chatId, pId, method, amt, walletNum]
        );

        bot.sendMessage(chatId, "✅ *Withdrawal Request Submitted!*");

        // Notify Group (Masked)
        bot.sendMessage(GROUP_ID, `💸 *Withdrawal Request*\n🆔 ID: \`${pId}\`\n🏦 Method: ${method}\n📱 Num: ${maskNumber(walletNum)}\n💰 Amt: ${amt}`, { parse_mode: "Markdown" });

        // Notify Admin (Full)
        bot.sendMessage(ADMIN_ID, `💸 *NEW WITHDRAWAL REQUEST*\n👤 User: \`${chatId}\`\n🆔 Player ID: \`${pId}\`\n🏦 Method: ${method}\n📱 Num: \`${walletNum}\`\n💰 Amt: ${amt}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ DONE", callback_data: `wdone_${chatId}_${pId}_${amt}` },
                    { text: "❌ REJECT", callback_data: `wrej_${chatId}_${pId}` }
                ]]
            }
        });
    }





});






// Helper to fetch dynamic message with a hardcoded fallback


// bot.on("callback_query", async (query) => {
//     const chatId = query.message.chat.id;
//     const data = query.data;

//     if (data === "dep_menu") {
//         const title = await getMsg('dep_menu_title', "📥 *Choose Method:*");
//         bot.sendMessage(chatId, title, {
//             parse_mode: "Markdown",
//             reply_markup: { inline_keyboard: [[{ text: "📸 Screenshot", callback_data: "dep_ss" }, { text: "⌨️ Manual", callback_data: "dep_manual" }]] }
//         });
//     } 
//     else if (data === "dep_ss") {
//         userState[chatId] = { step: 'WAITING_PHOTO' };
//         const msg = await getMsg('ss_start', "📸 *Send your payment screenshot now:*");
//         bot.sendMessage(chatId, msg);
//     } 
//     else if (data === "dep_manual") {
//         userState[chatId] = { step: 'M_TRX' };
//         const title = await getMsg('manual_entry_start', "⌨️ *Manual Entry*");
//         const step1 = await getMsg('m_step_1', "Step 1: Enter **Transaction ID**:");
//         bot.sendMessage(chatId, `${title}\n${step1}`, { parse_mode: "Markdown" });
//     } 
//     else if (data.startsWith("approve_")) {
//         const [_, userId, trxId, pId] = data.split("_");
        
//         await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        
//         const userMsg = await getMsg('user_dep_success', "✅ *Deposit Successful!*\nYour account has been updated.");
//         const groupMsg = await getMsg('group_dep_done', "💎 *Deposit Success*");
        
//         bot.sendMessage(userId, userMsg, { parse_mode: "Markdown" });
//         bot.sendMessage(GROUP_ID, `${groupMsg}\n🆔 ID: \`${pId}\`\n💰 Status: Completed Successfully!`, { parse_mode: "Markdown" });
        
//         bot.editMessageText(`✅ Approved: ${pId} (${trxId})`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
//     } 
//     else if (data.startsWith("reject_")) {
//         const [_, userId, pId] = data.split("_");
        
//         const userMsg = await getMsg('user_dep_rej', "❌ *Deposit Rejected.*\nYour payment verification was unsuccessful. Contact support.");
        
//         bot.sendMessage(userId, userMsg, { parse_mode: "Markdown" });
//         bot.sendMessage(GROUP_ID, `⚠️ *Deposit Rejected*\n🆔 ID: \`${pId}\`\nStatus: Unsuccessful.`, { parse_mode: "Markdown" });
        
//         bot.editMessageText(`❌ Rejected: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
//     }
//     else if (data === "withdraw") {
//         const title = await getMsg('withdraw_menu_title', "💸 *Select Method:*");
//         bot.sendMessage(chatId, title, {
//             reply_markup: {
//                 inline_keyboard: [
//                     [{ text: "bKash", callback_data: "w_bkash" }, { text: "Nagad", callback_data: "w_nagad" }],
//                     [{ text: "Rocket", callback_data: "w_rocket" }, { text: "Upay", callback_data: "w_upay" }]
//                 ]
//             }
//         });
//     }
//     else if (data.startsWith("w_")) {
//         const method = data.split("_")[1].toUpperCase();
//         userState[chatId] = { step: 'W_NUM', method: method };
//         bot.sendMessage(chatId, `📱 You selected **${method}**.\nEnter your Mobile Number:`);
//     }
//     else if (data.startsWith("wdone_")) {
//         const [_, userId, pId, amt] = data.split("_");
        
//         await db.query("UPDATE withdraw_history SET status = 'success' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'", [userId, pId]);
        
//         const userMsg = await getMsg('user_wd_paid', "✅ *Withdrawal Success!*");
//         const groupMsg = await getMsg('group_wd_done', "✅ *Withdrawal Paid*");
        
//         bot.sendMessage(userId, `${userMsg}\nYour request for ${amt} BDT has been paid.`, { parse_mode: "Markdown" });
//         bot.sendMessage(GROUP_ID, `${groupMsg}\n🆔 ID: \`${pId}\`\n💰 Amount: ${amt}\nStatus: Success`, { parse_mode: "Markdown" });
//         bot.editMessageText(`✅ Approved Withdrawal: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
//     }
//     else if (data.startsWith("wrej_")) {
//         const [_, userId, pId] = data.split("_");
        
//         await db.query("UPDATE withdraw_history SET status = 'rejected' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'", [userId, pId]);
        
//         const userMsg = await getMsg('user_wd_rej', "❌ *Withdrawal Rejected.*\nContact support for details.");
//         const groupMsg = await getMsg('group_wd_fail', "❌ *Withdrawal Rejected*");
        
//         bot.sendMessage(userId, userMsg);
//         bot.sendMessage(GROUP_ID, `${groupMsg}\n🆔 ID: \`${pId}\`\nStatus: Failed`, { parse_mode: "Markdown" });
//         bot.editMessageText(`❌ Rejected Withdrawal: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
//     }

//     bot.answerCallbackQuery(query.id);
// });






bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === "dep_menu") {
        bot.sendMessage(chatId, "📥 *Choose Method:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "📸 Screenshot", callback_data: "dep_ss" }, { text: "⌨️ Manual", callback_data: "dep_manual" }]] }
        });
    } 
    else if (data === "dep_ss") {
        userState[chatId] = { step: 'WAITING_PHOTO' };
        bot.sendMessage(chatId, "📸 *Send your payment screenshot now:*");
    } 
    else if (data === "dep_manual") {
        userState[chatId] = { step: 'M_TRX' };
        bot.sendMessage(chatId, "⌨️ *Manual Entry*\nStep 1: Enter **Transaction ID**:");
    } 
    else if (data.startsWith("approve_")) {
        const [_, userId, trxId, pId] = data.split("_");
        
        await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        
        bot.sendMessage(userId, "✅ *Deposit Successful!*\nYour account has been updated.", { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `💎 *Deposit Success*\n🆔 ID: \`${pId}\`\n💰 Status: Completed Successfully!`, { parse_mode: "Markdown" });
        
        bot.editMessageText(`✅ Approved: ${pId} (${trxId})`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    } 
    else if (data.startsWith("reject_")) {
        const [_, userId, pId] = data.split("_");
        
        bot.sendMessage(userId, "❌ *Deposit Rejected.*\nYour payment verification was unsuccessful. Contact support.");
        bot.sendMessage(GROUP_ID, `⚠️ *Deposit Rejected*\n🆔 ID: \`${pId}\`\nStatus: Unsuccessful.`, { parse_mode: "Markdown" });
        
        bot.editMessageText(`❌ Rejected: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }




else if (data === "withdraw") {
        bot.sendMessage(chatId, "💸 *Select Method:*", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "bKash", callback_data: "w_bkash" }, { text: "Nagad", callback_data: "w_nagad" }],
                    [{ text: "Rocket", callback_data: "w_rocket" }, { text: "Upay", callback_data: "w_upay" }]
                ]
            }
        });
    }
    else if (data.startsWith("w_")) {
        const method = data.split("_")[1].toUpperCase();
        userState[chatId] = { step: 'W_NUM', method: method };
        bot.sendMessage(chatId, `📱 You selected **${method}**.\nEnter your Mobile Number:`);
    }
    else if (data.startsWith("wdone_")) {
        const [_, userId, pId, amt] = data.split("_");
        
        await db.query("UPDATE withdraw_history SET status = 'success' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'", [userId, pId]);
        
        bot.sendMessage(userId, `✅ *Withdrawal Success!*\nYour request for ${amt} BDT has been paid.`, { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `✅ *Withdrawal Paid*\n🆔 ID: \`${pId}\`\n💰 Amount: ${amt}\nStatus: Success`, { parse_mode: "Markdown" });
        bot.editMessageText(`✅ Approved Withdrawal: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }
    else if (data.startsWith("wrej_")) {
        const [_, userId, pId] = data.split("_");
        
        await db.query("UPDATE withdraw_history SET status = 'rejected' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'", [userId, pId]);
        
        bot.sendMessage(userId, "❌ *Withdrawal Rejected.*\nContact support for details.");
        bot.sendMessage(GROUP_ID, `❌ *Withdrawal Rejected*\n🆔 ID: \`${pId}\`\nStatus: Failed`, { parse_mode: "Markdown" });
        bot.editMessageText(`❌ Rejected Withdrawal: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }



    bot.answerCallbackQuery(query.id);
});

















// ======================
// PHOTO HANDLING
// ======================
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]?.step !== 'WAITING_PHOTO') return;

    const loading = await bot.sendMessage(chatId, "⏳ *Scanning Receipt with AI...*", { parse_mode: "Markdown" });
    
    try {
        const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
        const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        
        // Using 'eng+ben' to handle English (Nexus/bKash) and Bengali (bKash/Nagad) text
        const { data: { text } } = await Tesseract.recognize(url, 'eng+ben');
        
        // --- 1. OPTIMIZED TRANSACTION ID LOGIC ---
        // We look for 8-12 character alphanumeric strings.
        // We filter out anything that looks like a Bangladesh phone number (starting with 01 or 8801).
        const allPotentialIds = text.match(/[A-Z0-9]{8,12}/g);
        const trx = allPotentialIds?.find(id => 
            !id.startsWith('01') && 
            !id.startsWith('8801') && 
            id.length >= 8
        ) || null;

        // --- 2. OPTIMIZED AMOUNT LOGIC ---
        // To get the Base Amount (e.g., 3900 instead of 3972), we prioritize specific keywords.
        let amt = null;
        
        // Priority 1: Look for "Amount" or "পরিমাণ" (This hits your 380, 15800, and 3900 targets)
        const baseAmtMatch = text.match(/(?:পরিমাণ|Amount|TxnAmount)[:\s]*[৳Tk]*\s?([\d,]+\.\d{2})/i);
        
        if (baseAmtMatch) {
            amt = baseAmtMatch[1].replace(/,/g, '');
        } else {
            // Priority 2: Fallback to any decimal number if keywords aren't found (NexusPay popup case)
            const fallBackAmt = text.match(/([\d,]+\.\d{2})/);
            amt = fallBackAmt ? fallBackAmt[1].replace(/,/g, '') : null;
        }

        // Clean up the "Reading" message
        bot.deleteMessage(chatId, loading.message_id).catch(() => {});

        // --- 3. FINAL VALIDATION & RESPONSE ---
        if (trx && amt) {
            userState[chatId] = { step: 'GET_ID_SS', trx, amt };
            bot.sendMessage(chatId, 
                `✅ *Scan Complete!*\n━━━━━━━━━━━━━━━\n🔑 *TRX ID:* \`${trx}\` \n💰 *Amount:* \`${amt}\` \n━━━━━━━━━━━━━━━\n👉 Enter your **Player ID** to complete deposit:`, 
                { parse_mode: "Markdown" }
            );
        } else {
            // If the scan failed to find one of the two, switch to manual mode
            userState[chatId] = { step: 'M_TRX' };
            bot.sendMessage(chatId, "⚠️ *Could not read details clearly.*\nPlease type your **Transaction ID** manually:");
        }

    } catch (e) { 
        console.error("OCR Error:", e);
        userState[chatId] = { step: 'M_TRX' };
        bot.sendMessage(chatId, "❌ *Error scanning image.* Please enter your **Transaction ID** manually:");
    }
});