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

    // 1. Ensure the unique constraint exists (Runs every time, but very fast)
    // This avoids manual DDL runs. 
    // We use a subquery check to see if the constraint already exists in pg_constraint.
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_trx_id') THEN
          ALTER TABLE sms_data ADD CONSTRAINT unique_trx_id UNIQUE (trx_id);
        END IF;
      END $$;
    `);

    // 2. Perform the Upsert/Insert logic
    const result = await db.query(
      `INSERT INTO sms_data (trx_id, amount, sender)
       VALUES ($1, $2, $3)
       ON CONFLICT (trx_id) DO NOTHING
       RETURNING *`,
      [trx_id, amount, sender]
    );

    // 3. Handle Duplicate Case
    if (result.rows.length === 0) {
      return res.status(409).json({
        status: 'exists',
        message: 'Transaction ID already recorded'
      });
    }

    res.json({
      status: 'inserted',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
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





























module.exports = router;