const TelegramBot = require('node-telegram-bot-api');
const Tesseract = require('tesseract.js');
const db = require('../db'); 
const fs = require("fs");
const path = require("path");


const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

// আপনার কনফিগারেশন
const OCR_API_KEY = 'K83723389188957';
const MAX_SIZE_MB = 1;
const GOOGLE_VISION_API_KEY = 'AIzaSyA8W3qJ-pjz5iSCwEvTZKcDkZBaQ_eTW0I';
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



const getMsg = async (key, fallback) => {
    try {
        const res = await db.query("SELECT value FROM bot_settings WHERE key = $1", [key]);
        return res.rows[0]?.value || fallback;
    } catch (err) {
        return fallback; // If DB fails, use hardcoded text
    }
};










const pinGroupUI = async () => {

    const title = await getMsg('group_title', '💰 TRX WALLET');
    const text = await getMsg('group_text', 'Welcome');
    const support = await getMsg('support_user', 'dpzonebd');

    const btn1 = await getMsg('btn_1', '🚀 Open Bot');


    let xx = support.trim()

    const msg = await bot.sendMessage(GROUP_ID,
        `🚀 *${title}*\n\n${text}`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: btn1,
                            url: `https://t.me/master_vai_bot?start=group`
                        }
                   ] ,[{
                            text: "💬 Support",
                            url: `https://t.me/${xx}`
                        }
                       
                    ]
                ]
            }
        }
    );

    await bot.pinChatMessage(GROUP_ID, msg.message_id);
};

pinGroupUI();


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
    const { trx_id, amount, playerId, senderNum, method , screenshot} = data;

    // 1. DUPLICATE CHECK
    const dupCheck = await db.query(
        "SELECT * FROM deposit_history WHERE trx_id = $1 AND (status = 'success' OR status = 'pending')",
        [trx_id]
    );

    if (dupCheck.rows.length > 0) {



        const duplicateErrorText = await getMsg('err_duplicate_full',`⚠️ *Duplicate Transaction!This TRX ID has already been submitted or processed.`
                                            );




        const dupMsg = await bot.sendMessage(chatId, duplicateErrorText);
     
        
        // Auto-delete user warning after 1 minute
        setTimeout(() => bot.deleteMessage(chatId, dupMsg.message_id).catch(() => {}), 60000);
        return;
    }



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

        const notFoundErrorText = await getMsg(
  'err_not_found_full',
  `❌ *Transaction Not Found.*
We couldn't verify this TRX. Please check details or try again later.`
);


        const nfMsg = await bot.sendMessage(chatId, notFoundErrorText);
      
        
        // Auto-delete after 5 minutes
        setTimeout(() => bot.deleteMessage(chatId, nfMsg.message_id).catch(() => {}), 300000);
    } else {
       
        const paymentVerifiedText = await getMsg(
  'verifying_success_full',
  `⏳ *Payment Verified!*
Please wait while the Admin performs the final approval.`
);

        await bot.sendMessage(chatId, paymentVerifiedText);
   




        const groupCaption = `📸নতুন ডিপোজিট\n` +
                             `━━━━━━━━━━━━━━━\n` +
                             `👤 ID: \`${playerId}\`\n` +
                             `💰 Amt: ${amount}\n` +
                             `🔑 TRX: \`${trx_id}\`\n` +
                             `⚙️ Method: ${method}\n` +
                             `━━━━━━━━━━━━━━━`;

        // sendPhoto ব্যবহার করে ছবি ও টেক্সট একসাথে পাঠানো
        bot.sendPhoto(GROUP_ID, screenshot, {
            caption: groupCaption,
            parse_mode: "Markdown"
        });



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
    if(!text) return ;

    // 2. FORCE START LOGIC
    if (text.toLowerCase() === '/start' || text.startsWith('/start')) {
      
        
        // Wipe state to ensure no one is "stuck"
        delete userState[chatId]; 
  const startTitle = await getMsg('main_menu_title', "💰 *TRX WALLET APP*");
    const depositBtn = await getMsg('deposit_btn', '💰 Deposit');
    const withdrawBtn = await getMsg('withdraw_btn', '💸 Withdraw');


        const menuOptions = {
            parse_mode: "Markdown",
            reply_markup: { 
                inline_keyboard: [
                    [{ text: depositBtn, callback_data: "dep_menu" }, { text: withdrawBtn, callback_data: "withdraw" }]
                ] 
            }
        };

        const startWelcomeText = await getMsg('start_welcome', 'Welcome! Choose an option below:');
        return bot.sendMessage(chatId, `💰 ${startTitle}\n${startWelcomeText}`, menuOptions)
            .catch(err => console.error("Error sending start message:", err));
    }

    // 3. Ignore all other commands starting with /
    if (text.startsWith('/')) return;

    // 4. Handle State Logic (Manual Steps)
    const state = userState[chatId];
    if (!state) return;

    if (state.step === 'M_TRX') {
        userState[chatId] = { ...state, step: 'M_AMT', trx: text };

           const step2 = await getMsg('m_step_2', "Step 2: Enter **Amount**:");

        bot.sendMessage(chatId, step2 ,{ parse_mode: "Markdown" });
    } 
    else if (state.step === 'M_AMT') {
        userState[chatId] = { ...state, step: 'M_ID', amt: text };
        const step3 = await getMsg('m_step_3', "Step 3: Enter **Player ID**:");
        bot.sendMessage(chatId, step3 , { parse_mode: "Markdown" });
    }  
    else if (state.step === 'M_ID') {
        const finalData = { trx_id: state.trx, amount: state.amt, playerId: text, senderNum: "text", method: 'Manual' };
        delete userState[chatId];
        const verifMsg = await getMsg('verifying_status', "⏳ Verifying... please wait.");
        bot.sendMessage(chatId, verifMsg ,{ parse_mode: "Markdown" });
        startVerificationRetry(chatId, finalData);
    }
    else if (state.step === 'GET_ID_SS') {
        // 1. Send the instant "Verifying" message
         const verifMsg = await getMsg('verifying_status', "⏳ *Verifying your payment... please wait.*");
        bot.sendMessage(chatId, verifMsg, { parse_mode: "Markdown" });

        // 2. Pass the data to your verification function
        startVerificationRetry(chatId, { 
            trx_id: state.trx, 
            amount: state.amt, 
            playerId: text, 
            senderNum: "From Photo", 
            method: 'Screenshot' ,
            screenshot: state.screenshot
        });

        // 3. Clean up the user state
        delete userState[chatId];
    }



// --- WITHDRAW STATES (New) ---
    else if (state.step === 'W_NUM') {
        const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
        if (!phoneRegex.test(text.replace(/\s/g, ''))) {

             const errFormat = await getMsg('err_invalid_format', "⚠️ *Invalid Format!*");
            return bot.sendMessage(chatId, errFormat);
        }
        userState[chatId] = { ...state, step: 'W_AMT', walletNum: text };

        const withdrawEnterAmountText = await getMsg(
  'withdraw_enter_amount',
  '💰 টাকার পরিমান উল্লেখ করুন ঃ'
);

        bot.sendMessage(chatId, `${withdrawEnterAmountText}`);
    }
    else if (state.step === 'W_AMT') {
        const invalidAmountText = await getMsg(
  'err_invalid_amount',
  '⚠️ Please enter a valid number for amount:'
);
        if (isNaN(text)) return bot.sendMessage(chatId, `${invalidAmountText}`);
        userState[chatId] = { ...state, step: 'W_ID', amt: text };

const withdrawEnterPinText = await getMsg(
  'withdraw_enter_pin',
  '🆔 ফাইনালি, আপনার গেট কোড দিন:'
);
        bot.sendMessage(chatId, `${withdrawEnterPinText}`);
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


   const successMsg = await getMsg('wd_success_msg', "✅ *Withdrawal Request Submitted!*");
        bot.sendMessage(chatId,successMsg , { parse_mode: "Markdown" });

        // Notify Group (Masked)

         const groupTitle = await getMsg('group_wd_req', "💸 *Withdrawal Request*");

        bot.sendMessage(GROUP_ID, `${groupTitle}\n🆔 ID: \`${pId}\`\n🏦 Method: ${method}\n📱 Num: ${maskNumber(walletNum)}\n💰 Amt: ${amt}`, { parse_mode: "Markdown" });

        // Notify Admin (Full)
           const adminTitle = await getMsg('admin_wd_req', "💸 *NEW WITHDRAWAL REQUEST*");
        bot.sendMessage(ADMIN_ID, `${adminTitle}\n👤 User: \`${chatId}\`\n🆔 Player ID: \`${pId}\`\n🏦 Method: ${method}\n📱 Num: \`${walletNum}\`\n💰 Amt: ${amt}`, {
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







bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
       const title = await getMsg('dep_menu_title', "📥 *Choose Method:*");


    const btn2 = await getMsg('btn_2', '📸 Screenshot');
    const btn3 = await getMsg('btn_3', '⌨️ Manual');

    if (data === "dep_menu") {
        bot.sendMessage(chatId,title, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [

                [
                    { text: btn2, callback_data: "dep_ss" }, 
                { text: btn3, callback_data: "dep_manual" }
                ]

            ] }
        });
    } 
    else if (data === "dep_ss") {
        userState[chatId] = { step: 'WAITING_PHOTO' };
         const msg = await getMsg('ss_start', "📸 *Send your payment screenshot now:*");
        bot.sendMessage(chatId, msg);
    } 
    else if (data === "dep_manual") {
        userState[chatId] = { step: 'M_TRX' };

        const title = await getMsg('manual_entry_start', "⌨️ *Manual Entry*");
        const step1 = await getMsg('m_step_1', "Step 1: Enter **Transaction ID**:");

        bot.sendMessage(chatId, `${title}\n${step1}` );
    } 
    else if (data.startsWith("approve_")) {
        const [_, userId, trxId, pId] = data.split("_");
        
        await db.query("UPDATE deposit_history SET status = 'success' WHERE trx_id = $1", [trxId]);
        
        const userMsg = await getMsg('user_dep_success', "✅ *Deposit Successful!*\nYour account has been updated.");
        const groupMsg = await getMsg('group_dep_done', "💎 *Deposit Success*");


        bot.sendMessage(userId, userMsg );

        const depositCompletedStatus = await getMsg(
  'status_completed',
  '💰 Status: Completed Successfully!'
);

        bot.sendMessage(GROUP_ID, `${groupMsg}\n🆔 ID: \`${pId}\`\n${depositCompletedStatus}`, { parse_mode: "Markdown" });
        
        bot.editMessageText(`✅ Approved: ${pId} (${trxId})`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    } 
    else if (data.startsWith("reject_")) {
        const [_, userId, pId] = data.split("_");
        

        const userMsg = await getMsg('user_dep_rej', "❌ *Deposit Rejected.*\nYour payment verification was unsuccessful. Contact support.");
        
        const groupDepositRejected = await getMsg('group_dep_reject', '⚠️ *Deposit Rejected*');

        bot.sendMessage(userId, userMsg);

        const depositFailedStatus = await getMsg(
  'status_unsuccessful',
  'Status: Unsuccessful.'
);

        bot.sendMessage(GROUP_ID, `${groupDepositRejected}\n🆔 ID: \`${pId}\`\n${depositFailedStatus}`, { parse_mode: "Markdown" });
        
        bot.editMessageText(`❌ Rejected: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }




else if (data === "withdraw") {

     const title = await getMsg('withdraw_menu_title', "💸 *Select Method:*");

const uploadDir = path.join(__dirname, "../../uploads");

const caption = await getMsg("withdraw_menu_title", "💸 Select Method");

const keyboard = {
    inline_keyboard: [
        [
            { text: "bKash", callback_data: "w_bkash" },
            { text: "Nagad", callback_data: "w_nagad" }
        ],
        [
            { text: "Rocket", callback_data: "w_rocket" },
            { text: "Upay", callback_data: "w_upay" }
        ]
    ]
};

try {

    // read all files directly from folder
    const files = fs.readdirSync(uploadDir)
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort((a, b) => b.localeCompare(a)); // latest first (optional)

    // CASE 1: no images
    if (!files.length) {
        return await bot.sendMessage(chatId, caption, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
    }

    const getPath = (file) => path.join(uploadDir, file);

    // CASE 2: single image
    if (files.length === 1) {
        return await bot.sendPhoto(
            chatId,
            fs.createReadStream(getPath(files[0])),
            {
                caption,
                parse_mode: "Markdown",
                reply_markup: keyboard
            }
        );
    }

    // CASE 3: multiple images
    const media = files.slice(0, 10).map((file, i) => ({
        type: "photo",
        media: fs.createReadStream(getPath(file)),
        caption: i === 0 ? caption : undefined
    }));

    await bot.sendMediaGroup(chatId, media);

    return await bot.sendMessage(chatId, "💸 Select Method", {
        reply_markup: keyboard
    });

} catch (err) {
    console.error("IMAGE SEND ERROR:", err);

    return bot.sendMessage(chatId, "⚠️ Failed to load images.");
}

     
        // bot.sendMessage(chatId, title, {
        //     reply_markup: {
        //         inline_keyboard: [
        //             [{ text: "bKash", callback_data: "w_bkash" }, { text: "Nagad", callback_data: "w_nagad" }],
        //             [{ text: "Rocket", callback_data: "w_rocket" }, { text: "Upay", callback_data: "w_upay" }]
        //         ]
        //     }
        // });










    }
    else if (data.startsWith("w_")) {
        const method = data.split("_")[1].toUpperCase();

        const withdrawMethodTemplate = await getMsg(
  'withdraw_method_selected',
  `নাম্বার লিখুন ঃ`
);
        
        userState[chatId] = { step: 'W_NUM', method: method };
        bot.sendMessage(chatId, `আপনার **${method}**.\n${withdrawMethodTemplate}`);
    }
    else if (data.startsWith("wdone_")) {
        const [_, userId, pId, amt] = data.split("_");
        
        await db.query("UPDATE withdraw_history SET status = 'success' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'", [userId, pId]);
        
 const userMsg = await getMsg('user_wd_paid', "✅ *Withdrawal Success!*");
const groupMsg = await getMsg('group_wd_done', "✅ *Withdrawal Paid*");


const userWithdrawPaidLine = await getMsg(
  'user_wd_paid_line',
  'টাকা প্রদান করা হয়েছে'
);

const withdrawSuccessStatus = await getMsg(
  'status_success',
  'Status: Success'
);
        bot.sendMessage(userId, `${userMsg}\n ${amt} ${userWithdrawPaidLine} `, { parse_mode: "Markdown" });
        bot.sendMessage(GROUP_ID, `${groupMsg}\n🆔 ID: \`${pId}\`\n💰 Amount: ${amt}\n${withdrawSuccessStatus}`, { parse_mode: "Markdown" });
        bot.editMessageText(`✅ Approved Withdrawal: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }
    else if (data.startsWith("wrej_")) {
        const [_, userId, pId] = data.split("_");
        
        await db.query("UPDATE withdraw_history SET status = 'rejected' WHERE user_id = $1 AND player_id = $2 AND status = 'pending'", [userId, pId]);
        

        const userMsg = await getMsg('user_wd_rej', "❌ *Withdrawal Rejected.*\nContact support for details.");
        const groupMsg = await getMsg('group_wd_fail', "❌ *Withdrawal Rejected*");

        const withdrawFailedStatus = await getMsg(
  'status_failed',
  'Status: Failed'
);

        bot.sendMessage(userId,userMsg);
        bot.sendMessage(GROUP_ID, `${groupMsg}\n🆔 ID: \`${pId}\`\n${withdrawFailedStatus}`, { parse_mode: "Markdown" });
        bot.editMessageText(`❌ Rejected Withdrawal: ${pId}`, { chat_id: ADMIN_ID, message_id: query.message.message_id });
    }



    bot.answerCallbackQuery(query.id);
});







async function extractTransactionData(imageUrl) {
    try {
        // ১. ইমেজ ডাউনলোড এবং রিসাইজ (১ এমবি লিমিট হ্যান্ডলিং)
        const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        let buffer = Buffer.from(imageRes.data);

        // সাইজ ১ এমবির বেশি হলে কোয়ালিটি কমিয়ে ছোট করা
        if (buffer.length > 1024 * 1024) {
            buffer = await sharp(buffer)
                .resize(1200) 
                .jpeg({ quality: 85 })
                .toBuffer();
        }

        // ২. OCR.space এপিআই কল
        const form = new FormData();
        form.append('apikey', OCR_API_KEY);
        form.append('OCREngine', '2'); // ঝাপসা ছবির জন্য অপরিহার্য
        form.append('file', buffer, { filename: 'image.jpg' });

        const res = await axios.post('https://api.ocr.space/parse/image', form, {
            headers: form.getHeaders()
        });

        const text = res.data.ParsedResults?.[0]?.ParsedText || "";
        console.log("OCR Text:", text); // ডিবাগিং এর জন্য

        // ৩. ডাটা এক্সট্রাকশন (আপনার দেওয়া লজিক সহ উন্নত ভার্সন)
        return parseFinalData(text);

    } catch (err) {
        console.error("OCR Error:", err);
        return { trx: null, amt: null };
    }
}

function parseFinalData(text) {
    // ১. ট্রানজেকশন আইডি খোঁজা
    // বিকাশ/নগদ আইডি (যেমন: DE34R1DIS2) অথবা নেক্সাস পে আইডি (যেমন: 6408688276)
    const idRegex = /\b([A-Z0-9]{8,12})\b/g;
    const matches = text.match(idRegex) || [];
    
    let trx = matches.find(id => 
        (/[A-Z]/.test(id) && !id.startsWith('01') && id.length >= 8) || // বিকাশ/নগদ আলফানিউমেরিক
        (/^\d{10}$/.test(id)) // নেক্সাস পে ১০ ডিজিটের আইডি
    ) || null;

    // ২. অ্যামাউন্ট খোঁজা
    let amt = null;

    // কিউওয়ার্ড ভিত্তিক সার্চ (সবথেকে নির্ভুল)
    const priorityMatch = text.match(/(?:Amount|TxnAmount|পরিমাণ|অ্যামাউন্ট|Total)[:\s]*[৳Tk]*\s?([\d,]+\.\d{2})/i);
    
    if (priorityMatch) {
        amt = priorityMatch[1].replace(/,/g, '');
    } else {
        // যদি কিউওয়ার্ড না পায় (যেমন ৮ নং বা ২ নং ছবির ক্ষেত্রে), তবে সব সংখ্যা বের করা
        // আমরা শুধু পজিটিভ ডেসিমেল নাম্বারগুলো নেব
        const allNumbers = text.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g);
        
        if (allNumbers) {
            const cleanedAmts = allNumbers
                .map(n => parseFloat(n.replace(/,/g, '')))
                .filter(n => n > 10); // খুব ছোট সংখ্যা (যেমন VAT বা Fee) বাদ দিতে

            // সাধারণত ট্রানজেকশন অ্যামাউন্ট ব্যালেন্সের চেয়ে বড় হয় না, 
            // কিন্তু চার্জের চেয়ে বড় হয়। তাই আমরা দ্বিতীয় সর্বোচ্চ বা 
            // লজিক্যালি ফিল্টার করা সংখ্যাটি নিতে পারি।
            // তবে বেশিরভাগ স্ক্রিনশটে বড় সংখ্যাটিই পেমেন্ট অ্যামাউন্ট হয়।
            amt = cleanedAmts.length > 0 ? Math.max(...cleanedAmts).toString() : null;
        }
    }

    // আপনার চাহিদা অনুযায়ী ভেরিয়েবলে সেভ করা
    return { 
        trx: trx ? trx : null, 
        amt: amt ? amt : null 
    };
}


async function extractBestData(imageBuffer) {
    try {
        const base64Image = imageBuffer.toString('base64');
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

        const requestData = {
            requests: [{
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION' }]
            }]
        };

        const response = await axios.post(url, requestData);
        const fullText = response.data.responses[0]?.fullTextAnnotation?.text || "";

        let amt = null;
        let trx = null;

        // ১. ট্রানজেকশন আইডি (TrxID) ফিল্টারিং
        // নেক্সাস পে (NexusPay) এর ১০ ডিজিটের আইডি আগে চেক করা
        const nexusMatch = fullText.match(/Txnld:(\d{10})/i);
        if (nexusMatch) {
            trx = nexusMatch[1];
        } else {
            // বিকাশ/নগদ এর আলফানিউমেরিক আইডি (৮-১২ ক্যারেক্টার)
            const idRegex = /\b([A-Z0-9]{8,12})\b/g;
            const matches = fullText.match(idRegex) || [];
            trx = matches.find(id => 
                /[A-Z]/.test(id) && // অন্তত একটি অক্ষর থাকতে হবে
                !/^(TOTAL|BALANCE|TIME|DATE|AM|PM)$/i.test(id) && // সাধারণ শব্দ বাদ
                !id.startsWith('01') // মোবাইল নম্বর বাদ
            );
        }

        // ২. আসল অ্যামাউন্ট (Actual Amount) বের করা
        // আমরা "পরিমাণ", "টাকা" বা "Amount" কিউওয়ার্ডের পাশের সংখ্যাটিই নেব
        const primaryAmountMatch = fullText.match(/(?:Amount|TxnAmount|পরিমাণ|টাকা|অ্যামাউন্ট|Total)[:\s]*[৳Tk]*\s?([\d,]+\.\d{2})/i);
        
        if (primaryAmountMatch) {
            amt = primaryAmountMatch[1].replace(/,/g, '');
        } else {
            // বিকাশ ইনবক্স বা ক্যাশ আউটের ক্ষেত্রে (যেখানে '+' চিহ্ন থাকে)
            const bKashInboxMatch = fullText.match(/\+\s?[৳Tt]([\d,]+\.\d{2})/);
            if (bKashInboxMatch) {
                amt = bKashInboxMatch[1].replace(/,/g, '');
            } else {
                // যদি কিছুই না পাওয়া যায়, তবে সব ডেসিমেল নাম্বারের মধ্য থেকে ফিল্টার করা
                const numbers = fullText.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g) || [];
                const candidates = numbers.map(n => parseFloat(n.replace(/,/g, '')));
                
                // নেক্সাস পে বা বিকাশে ফি (Fee) এবং ভ্যাট (VAT) সাধারণত খুব ছোট হয়। 
                // আর ব্যালেন্স সব সময় অ্যামাউন্টের চেয়ে অনেক বড় হয় না, কিন্তু কিউওয়ার্ড ছাড়া এটি বের করা কঠিন।
                // তাই আমরা 'Fee' বা 'Charge' শব্দগুলোর পজিশন চেক করে সেগুলো বাদ দিচ্ছি।
                amt = candidates.find(c => c > 10 && !fullText.includes(`Charge: ${c}`) && !fullText.includes(`Fee: ${c}`)) || null;
                if (amt) amt = amt.toString();
            }
        }

        return { 
            amt: amt ? amt.trim() : null, 
            trx: trx ? trx.trim() : null 
        };

    } catch (error) {
        console.error("Google Vision Error:", error.message);
        return { amt: null, trx: null };
    }
}




// ======================
// PHOTO HANDLING
// ======================
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;





   if (userState[chatId]?.step === 'W_ID') {

        const { method, walletNum, amt } = userState[chatId];
        const fileId = msg.photo[msg.photo.length - 1].file_id;

        const pId = `SS_${Date.now()}`;

        delete userState[chatId];

        // SAVE
        await db.query(
            "INSERT INTO withdraw_history (user_id, player_id, method, amount, wallet_number, status) VALUES ($1, $2, $3, $4, $5, 'pending')",
            [chatId, pId, method, amt, walletNum]
        );

        const successMsg = await getMsg('wd_success_msg', "✅ *Withdrawal Request Submitted!*");
        bot.sendMessage(chatId, successMsg, { parse_mode: "Markdown" });

        const groupTitle = await getMsg('group_wd_req', "💸 *Withdrawal Request*");

    


            bot.sendPhoto(
                GROUP_ID, fileId, {
            caption:
                `${groupTitle}\n🆔 ID: \`By Screenshot\`\n🏦 Method: ${method}\n📱 Num: ${maskNumber(walletNum)}\n💰 Amt: ${amt}`,
            parse_mode: "Markdown",}
        
        );










        const adminTitle = await getMsg('admin_wd_req', "💸 *NEW WITHDRAWAL REQUEST*");

        bot.sendPhoto(ADMIN_ID, fileId, {
            caption:
                `${adminTitle}\n👤 User: \`${chatId}\`\n🆔 Player ID: \`By Screenshot\`\n🏦 Method: ${method}\n📱 Num: \`${walletNum}\`\n💰 Amt: ${amt}`,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ DONE", callback_data: `wdone_${chatId}_${pId}_${amt}` },
                    { text: "❌ REJECT", callback_data: `wrej_${chatId}_${pId}` }
                ]]
            }
        });

        return; // 🚨 MUST STOP HERE
    }































    if (userState[chatId]?.step !== 'WAITING_PHOTO') return;
const ocrScanningText = await getMsg('ocr_status', '⏳ *Scanning Receipt with AI...*');
    const loading = await bot.sendMessage(chatId, `${ocrScanningText}`);
    
    try {




        const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;


let amt = null;
let trx = null;

try {
    // ১. ইউআরএল থেকে ইমেজটিকে বাফার হিসেবে ডাউনলোড করা
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // ২. বাফারটি আপনার এক্সট্রাকশন ফাংশনে পাঠানো
    const extractedData = await extractBestData(imageBuffer);

    // ৩. সরাসরি ভেরিয়েবলে ডাটা সেভ করা
    amt = extractedData.amt;
    trx = extractedData.trx;

    console.log(`Extracted -> Amount: ${amt}, TrxID: ${trx}`);

} catch (error) {
    console.error("Extraction failed:", error.message);
    amt = null;
    trx = null;
}


                // Clean up the "Reading" message
                bot.deleteMessage(chatId, loading.message_id).catch(() => {});
        const fileId = msg.photo[msg.photo.length - 1].file_id;
                // --- 3. FINAL VALIDATION & RESPONSE ---
                if (trx && amt) {
                    userState[chatId] = { step: 'GET_ID_SS', trx, amt , screenshot: fileId };

                    const ocrSuccessTitle = await getMsg('ocr_success', '✅ *Scan Complete!*');
        const ocrPlayerPrompt = await getMsg('ocr_player_prompt', '👉 আপনার প্লেয়ার আইডি দিনঃ:');

        bot.sendMessage(chatId, `${ocrSuccessTitle}\n━━━━━━━━━━━━━━━\n🔑 *TRX ID:* \`${trx}\` \n💰 *Amount:* \`${amt}\` \n━━━━━━━━━━━━━━━\n${ocrPlayerPrompt}`);
                } else {
                    // If the scan failed to find one of the two, switch to manual mode

        const scanFailText = await getMsg(
        'err_scan_fail_full',
        `আপনার স্ক্রিনশটটি সঠিকভাবে এনালাইসিস করা যাচ্ছে না।
        দয়া করে আপনার ট্রানজেকশন আইডি লিখুনঃ`
        );


                    userState[chatId] = { step: 'M_TRX' };
                    bot.sendMessage(chatId, `${scanFailText}`);
                }

    } catch (e) { 
        console.error("OCR Error:", e);
        userState[chatId] = { step: 'M_TRX' };

        const ocrErrorText = await getMsg(
  'err_ocr_gen',
  '❌ *Error scanning image.* Please enter your **Transaction ID** manually:'
);

        bot.sendMessage(chatId, `${ocrErrorText}`);
    }
});