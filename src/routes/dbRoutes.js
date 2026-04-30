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
router.post('/sms', async (req, res) => {
  try {
    const { trx_id, amount, sender } = req.body;

    // 1. Check if it exists
    const checkExist = await db.query(
      'SELECT trx_id FROM sms_data WHERE trx_id = $1',
      [trx_id]
    );

    if (checkExist.rows.length > 0) {
      return res.status(409).json({
        status: 'exists',
        message: 'Transaction ID already exists in database'
      });
    }

    // 2. If not, insert
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
        // 1. Create the table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS bot_settings (
                key VARCHAR(100) PRIMARY KEY,
                label VARCHAR(255),
                value TEXT NOT NULL,
                category VARCHAR(50)
            );
        `);

        // 2. All 27 hardcoded data entries
        const settings = [
            // 1. User-Facing Menu
            ['main_menu_title', 'Main Menu Title', '💰 *TRX WALLET APP*', 'Menu'],
            ['dep_menu_title', 'Deposit Method Menu', '📥 *Choose Method:*', 'Menu'],
            ['withdraw_menu_title', 'Withdraw Method Menu', '💸 *Select Method:*', 'Menu'],
            ['manual_entry_start', 'Manual Entry Start', '⌨️ *Manual Entry*', 'Menu'],
            ['ss_start', 'Screenshot Start', '📸 *Send your payment screenshot now:*', 'Menu'],
            
            // 2. Deposit Process
            ['ocr_status', 'OCR Scanning Status', '⏳ *Scanning Receipt with AI...*', 'Deposit'],
            ['ocr_success', 'OCR Success Title', '✅ *Scan Complete!*', 'Deposit'],
            ['m_step_1', 'Manual Step 1', 'Step 1: Enter Transaction ID:', 'Deposit'],
            ['m_step_2', 'Manual Step 2', 'Step 2: Enter Amount:', 'Deposit'],
            ['m_step_3', 'Manual Step 3', 'Step 3: Enter Player ID:', 'Deposit'],
            ['verifying_status', 'Verification Status', '⏳ *Verifying your payment... please wait.*', 'Deposit'],
            ['verifying_success', 'Verification Success', '⏳ *Payment Verified!*', 'Deposit'],
            
            // 3. Admin & Group Notifications
            ['admin_dep_req', 'Admin Deposit Header', '💰 *NEW DEPOSIT APPROVAL REQ*', 'Admin'],
            ['admin_wd_req', 'Admin Withdrawal Header', '💸 *NEW WITHDRAWAL REQUEST*', 'Admin'],
            ['group_dep_sub', 'Group Deposit Submission', '✅ *Deposit Request submitted*', 'Group'],
            ['group_wd_req', 'Group Withdrawal Request', '💸 *Withdrawal Request*', 'Group'],
            
            // 4. Status & Error Alerts
            ['err_duplicate', 'Duplicate TRX Error', '⚠️ *Duplicate Transaction!*', 'Errors'],
            ['err_not_found', 'TRX Not Found Error', '❌ *Transaction Not Found.*', 'Errors'],
            ['err_scan_fail', 'Scan Failure Alert', '⚠️ *Could not read details clearly.*', 'Errors'],
            ['wd_success_msg', 'Withdrawal Success Alert', '✅ *Withdrawal Request Submitted!*', 'Withdraw'],
            ['err_invalid_format', 'Invalid Phone Format', '⚠️ *Invalid Format!*', 'Errors'],
            ['err_ocr_gen', 'General OCR Error', '❌ *Error scanning image.*', 'Errors'],
            
            // 5. Final Approval/Rejection
            ['user_dep_success', 'User Deposit Success', '✅ *Deposit Successful!*', 'Final'],
            ['user_dep_rej', 'User Deposit Rejected', '❌ *Deposit Rejected.*', 'Final'],
            ['user_wd_paid', 'User Withdrawal Paid', '✅ *Withdrawal Success!*', 'Final'],
            ['user_wd_rej', 'User Withdrawal Rejected', '❌ *Withdrawal Rejected.*', 'Final'],
            ['group_dep_done', 'Group Deposit Success', '💎 *Deposit Success*', 'Group'],
            ['group_wd_done', 'Group Withdrawal Paid', '✅ *Withdrawal Paid*', 'Group'],
            ['group_wd_fail', 'Group Withdrawal Rejected', '❌ *Withdrawal Rejected*', 'Group']
        ];

        // 3. Insert data using ON CONFLICT to prevent errors on multiple visits
        for (const [key, label, value, cat] of settings) {
            await db.query(`
                INSERT INTO bot_settings (key, label, value, category) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (key) DO NOTHING
            `, [key, label, value, cat]);
        }

        res.status(200).send({
            success: true,
            message: "Database initialized and 27 settings seeded successfully.",
            instruction: "You can now visit /admin/settings to manage these values."
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({
            success: false,
            error: err.message
        });
    }
});


















module.exports = router;