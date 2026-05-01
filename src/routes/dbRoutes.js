const express = require('express');
const router = express.Router();

const db = require('../db/index');

/**
 * 🔹 TEST ROUTE
 */
router.get('/ping', (req, res) => {
  res.json({ status: 'DB ROUTES ACTIVE' });
});

router.post('/init-deposit', async (req, res) => {
  try {
    
    // TRANSACTIONS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        trx_id TEXT UNIQUE,
        amount NUMERIC,
        sender TEXT,
        user_id TEXT,
        player_id TEXT,
        status TEXT DEFAULT 'processing',
        source TEXT,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // SMS DATA TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS sms_data (
        id SERIAL PRIMARY KEY,
        trx_id TEXT,
        amount NUMERIC,
        sender TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.json({
      status: 'success',
      message: 'Database initialized successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error999',
      message: err.message
    });
  }
});

router.post('/init-withdraw', async (req, res) => {
  try {

    await db.query(`
      CREATE TABLE IF NOT EXISTS withdraw_requests (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        amount NUMERIC,
        method TEXT,
        account_number TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.json({
      status: 'success',
      message: 'Withdraw table created successfully'
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/**
 * 🔹 INSERT SMS DATA (from SMS forwarder simulation)
 */
// router.post('/sms', async (req, res) => {
//   try {
//     const { trx_id, amount, sender } = req.body;

//     // 1. Check if it exists
//     const checkExist = await db.query(
//       'SELECT trx_id FROM sms_data WHERE trx_id = $1',
//       [trx_id]
//     );

//     if (checkExist.rows.length > 0) {
//       return res.status(409).json({
//         status: 'exists',
//         message: 'Transaction ID already exists in database'
//       });
//     }

//     // 2. If not, insert
//     const result = await db.query(
//       `INSERT INTO sms_data (trx_id, amount, sender)
//        VALUES ($1, $2, $3)
//        RETURNING *`,
//       [trx_id, amount, sender]
//     );

//     res.json({
//       status: 'inserted',
//       data: result.rows[0]
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

router.post('/sms', async (req, res) => {
  try {
    let { trx_id, amount, sender } = req.body;

    if (!sender) {
      return res.status(400).json({ error: "Sender required" });
    }

    // normalize sender (remove spaces, dashes etc)
    sender = sender.replace(/[\s-]/g, "");

    // ❌ BLOCK Bangladeshi personal numbers
    const isBDNumber =
      /^01[3-9]\d{8}$/.test(sender) ||        // 017XXXXXXXX
      /^\+8801[3-9]\d{8}$/.test(sender);     // +88017XXXXXXXX

    if (isBDNumber) {
      return res.status(403).json({
        status: "blocked",
        message: "Personal BD numbers are not allowed"
      });
    }

    // 1. Check if trx exists
    const checkExist = await db.query(
      'SELECT trx_id FROM sms_data WHERE trx_id = $1',
      [trx_id]
    );

    if (checkExist.rows.length > 0) {
      return res.status(409).json({
        status: 'exists',
        message: 'Transaction ID already exists'
      });
    }

    // 2. Insert
    const result = await db.query(
      `INSERT INTO sms_data (trx_id, amount, sender)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [trx_id, amount, sender]
    );

    res.json({
      status: 'inserted',
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * 🔹 CREATE TRANSACTION (manual test / bot will use later)
 */
router.post('/transaction', async (req, res) => {
  try {
    const {
      trx_id,
      amount,
      sender,
      user_id,
      player_id,
      source
    } = req.body;

    const result = await db.query(
      `INSERT INTO transactions
      (trx_id, amount, sender, user_id, player_id, source, status)
      VALUES ($1,$2,$3,$4,$5,$6,'processing')
      RETURNING *`,
      [trx_id, amount, sender, user_id, player_id, source]
    );

    res.json({
      status: 'created',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.json({ status: 'duplicate', message: 'TRX already exists' });
    }

    res.status(500).json({ error: err.message });
  }
});



/**
 * 🔹 GET ALL TRANSACTIONS
 */
router.get('/transactions', async (req, res) => {
  const result = await db.query(
    `SELECT * FROM transactions ORDER BY id DESC`
  );

  res.json(result.rows);
});



/**
 * 🔹 GET ALL SMS DATA
 */
router.get('/sms-data', async (req, res) => {
  const result = await db.query(
    `SELECT * FROM sms_data ORDER BY id DESC`
  );

  res.json(result.rows);
});


/**
 * =========================
 * CREATE WITHDRAW REQUEST
 * =========================
 */
router.post('/create', async (req, res) => {
  try {
    const {
      user_id,
      amount,
      method,
      account_number
    } = req.body;

    const result = await db.query(
      `INSERT INTO withdraw_requests
      (user_id, amount, method, account_number, status)
      VALUES ($1,$2,$3,$4,'pending')
      RETURNING *`,
      [user_id, amount, method, account_number]
    );

    res.json({
      status: 'success',
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * =========================
 * GET USER WITHDRAW HISTORY
 * =========================
 */
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await db.query(
      `SELECT * FROM withdraw_requests
       WHERE user_id = $1
       ORDER BY id DESC`,
      [user_id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * =========================
 * GET ALL WITHDRAW REQUESTS (ADMIN)
 * =========================
 */
router.get('/all', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM withdraw_requests
       ORDER BY id DESC`
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * =========================
 * APPROVE WITHDRAW (ADMIN)
 * =========================
 */
router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE withdraw_requests
       SET status = 'approved'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      status: 'approved',
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * =========================
 * REJECT WITHDRAW (ADMIN)
 * =========================
 */
router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE withdraw_requests
       SET status = 'rejected'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      status: 'rejected',
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});










router.get('/setmyadmin', async (req, res) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS bot_settings (
                key VARCHAR(100) PRIMARY KEY,
                label VARCHAR(255),
                value TEXT NOT NULL,
                category VARCHAR(50)
            );
        `);

        const settings = [
            // ======================
            // 1. USER MENU
            // ======================
            ['main_menu_title', 'Main Menu Title', '💰 *TRX WALLET APP*', 'Menu'],
            ['start_welcome', 'Start Welcome Text', 'Welcome! Choose an option below:', 'Menu'],
            ['dep_menu_title', 'Deposit Method Menu', '📥 *Choose Method:*', 'Menu'],
            ['withdraw_menu_title', 'Withdraw Method Menu', '💸 *Select Method:*', 'Menu'],
            ['manual_entry_start', 'Manual Entry Start', '⌨️ *Manual Entry*', 'Menu'],
            ['ss_start', 'Screenshot Start', '📸 *Send your payment screenshot now:*', 'Menu'],

            // ======================
            // 2. DEPOSIT PROCESS
            // ======================
            ['ocr_status', 'OCR Scanning Status', '⏳ *Scanning Receipt with AI...*', 'Deposit'],
            ['ocr_success', 'OCR Success Title', '✅ *Scan Complete!*', 'Deposit'],
            ['ocr_player_prompt', 'Ask Player ID After OCR', '👉 আপনার প্লেয়ার আইডি দিনঃ:', 'Deposit'],

            ['m_step_1', 'Manual Step 1', 'Step 1: Enter Transaction ID:', 'Deposit'],
            ['m_step_2', 'Manual Step 2', 'Step 2: Enter Amount:', 'Deposit'],
            ['m_step_3', 'Manual Step 3', 'Step 3: Enter Player ID:', 'Deposit'],

            ['verifying_status', 'Verification Status', '⏳ *Verifying your payment... please wait.*', 'Deposit'],
            ['verifying_success_full', 'Verification Success Full',
`⏳ *Payment Verified!*
Please wait while the Admin performs the final approval.`, 'Deposit'],

            // ======================
            // 3. ERRORS
            // ======================
            ['err_duplicate_full', 'Duplicate Full Message',
`⚠️ *Duplicate Transaction!*
This TRX ID has already been submitted or processed.`, 'Errors'],

            ['err_not_found_full', 'Not Found Full Message',
`❌ *Transaction Not Found.*
We couldn't verify this TRX. Please check details or try again later.`, 'Errors'],

            ['err_invalid_format', 'Invalid Phone Format', '⚠️ *Invalid Format!*', 'Errors'],
            ['err_invalid_amount', 'Invalid Amount', '⚠️ Please enter a valid number for amount:', 'Errors'],

            ['err_scan_fail_full', 'Scan Fail Full',
`আপনার স্ক্রিনশটটি সঠিকভাবে এনালাইসিস করা যাচ্ছে না।
দয়া করে আপনার ট্রানজেকশন আইডি লিখুনঃ`, 'Errors'],

            ['err_ocr_gen', 'General OCR Error',
'❌ *Error scanning image.* Please enter your **Transaction ID** manually:', 'Errors'],

            // ======================
            // 4. WITHDRAW FLOW
            // ======================
            ['withdraw_enter_amount', 'Withdraw Enter Amount', '💰 টাকার পরিমান উল্লেখ করুন ঃ', 'Withdraw'],
            ['withdraw_enter_pin', 'Withdraw Enter PIN', '🆔 ফাইনালি, আপনার গেট কোড দিন:', 'Withdraw'],

            ['withdraw_method_selected', 'Withdraw Method Selected',
`📱 You selected 
Enter your Mobile Number:`, 'Withdraw'],

            ['wd_success_msg', 'Withdrawal Success Alert', '✅ *Withdrawal Request Submitted!*', 'Withdraw'],

            // ======================
            // 5. ADMIN & GROUP
            // ======================
            ['admin_dep_req', 'Admin Deposit Header', '💰 *NEW DEPOSIT APPROVAL REQ*', 'Admin'],
            ['admin_wd_req', 'Admin Withdrawal Header', '💸 *NEW WITHDRAWAL REQUEST*', 'Admin'],

            ['group_dep_sub', 'Group Deposit Submission', '✅ *Deposit Request submitted*', 'Group'],
            ['group_dep_done', 'Group Deposit Success', '💎 *Deposit Success*', 'Group'],
            ['group_dep_reject', 'Group Deposit Rejected', '⚠️ *Deposit Rejected*', 'Group'],

            ['group_wd_req', 'Group Withdrawal Request', '💸 *Withdrawal Request*', 'Group'],
            ['group_wd_done', 'Group Withdrawal Paid', '✅ *Withdrawal Paid*', 'Group'],
            ['group_wd_fail', 'Group Withdrawal Rejected', '❌ *Withdrawal Rejected*', 'Group'],

            // ======================
            // 6. STATUS TEXTS
            // ======================
            ['status_completed', 'Completed Status', '💰 Status: Completed Successfully!', 'Status'],
            ['status_unsuccessful', 'Unsuccessful Status', 'Status: Unsuccessful.', 'Status'],
            ['status_success', 'Success Status', 'Status: Success', 'Status'],
            ['status_failed', 'Failed Status', 'Status: Failed', 'Status'],



            
            // ======================
            // 7. USER FINAL
            // ======================
            ['user_dep_success', 'User Deposit Success', '✅ *Deposit Successful!*', 'Final'],
            ['user_dep_rej', 'User Deposit Rejected', '❌ *Deposit Rejected.*', 'Final'],

            ['user_wd_paid', 'User Withdrawal Paid', '✅ *Withdrawal Success!*', 'Final'],
            ['user_wd_paid_line', 'User Withdrawal Paid Line',
'Your request for amount BDT has been paid.', 'Final'],

            ['user_wd_rej', 'User Withdrawal Rejected', '❌ *Withdrawal Rejected.*', 'Final'],
        ];

        for (const [key, label, value, cat] of settings) {
            await db.query(`
                INSERT INTO bot_settings (key, label, value, category)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (key) DO NOTHING
            `, [key, label, value, cat]);
        }

        res.status(200).send({
            success: true,
            total: settings.length,
            message: "✅ All refined texts added successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({
            success: false,
            error: err.message
        });
    }
});


router.post('/setgroupui', async (req, res) => {
    try {
        const {
            group_title,
            group_text,
            button_1,
            button_2,
            button_3,
            deposit_btn,
            withdraw_btn,
            support_user
        } = req.body;

        const updates = [
            ['group_title', 'Group Title', group_title, 'GroupUI'],
            ['group_text', 'Group Text', group_text, 'GroupUI'],

            ['btn_1', 'Button 1', button_1, 'GroupUI'],
            ['btn_2', 'Button 2', button_2, 'GroupUI'],
            ['btn_3', 'Button 3', button_3, 'GroupUI'],

            ['deposit_btn', 'Deposit Button', deposit_btn, 'GroupUI'],
            ['withdraw_btn', 'Withdraw Button', withdraw_btn, 'GroupUI'],

            ['support_user', 'Support User', support_user, 'GroupUI']
        ];

        for (const [key, label, value, cat] of updates) {
            if (!value) continue;

            await db.query(`
                INSERT INTO bot_settings (key, label, value, category)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (key)
                DO UPDATE SET value = EXCLUDED.value
            `, [key, label, value, cat]);
        }

        res.send({
            success: true,
            message: "✅ Group UI updated successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({
            success: false,
            error: err.message
        });
    }
});






router.get('/admin/initimg', async (req, res) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS bot_setting_images (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL,
                image_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        res.send({
            success: true,
            message: "bot_setting_images table created or already exists"
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({
            success: false,
            error: err.message
        });
    }
});





// ⚠️ *Duplicate Transaction!*
// This TRX ID has already been submitted or processed.



// ❌ *Transaction Not Found.*

// We couldn't verify this TRX. Please check details or try again later.



// ⏳ *Payment Verified!*
// Please wait while the Admin performs the final approval.



// 💰 টাকার পরিমান উল্লেখ করুন ঃ



// ⚠️ Please enter a valid number for amount:


// 🆔 ফাইনালি, আপনার গেট কোড দিন:

// 📱 You selected 

// Enter your Mobile Number:

// ⏳ *Scanning Receipt with AI...*

// ✅ *Scan Complete!*

// 👉 আপনার প্লেয়ার আইডি দিনঃ:

// আপনার স্ক্রিনশটটি সঠিকভাবে এনালাইসিস করা যাচ্ছে না।
// দয়া করে আপনার ট্রানজেকশন আইডি লিখুনঃ

// ❌ *Error scanning image.* Please enter your **Transaction ID** manually:


// Welcome! Choose an option below:

// 💰 Status: Completed Successfully!

// ⚠️ *Deposit Rejected*



// Your request for amount BDT has been paid.

// Status: Success

// Status: Failed






module.exports = router;