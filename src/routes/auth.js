const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

// Generate a random license key
function generateKey(username) {
  const rand = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `PRESET-${username.toUpperCase()}-${rand}`;
}

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (Date.now() > user.expiry_date) {
      return res.status(403).json({ success: false, message: 'Your license has expired' });
    }

    return res.json({
      success: true,
      user: {
        username: user.username,
        key: user.key,
        expiryDate: user.expiry_date,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/register
// Protected by ADMIN_SECRET header — only you can create accounts
router.post('/register', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { username, password, days } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const durationDays = days && Number.isInteger(days) && days > 0 ? days : 9999; // default lifetime
  const expiryDate = Date.now() + durationDays * 24 * 60 * 60 * 1000;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const key = generateKey(username);

    const result = await pool.query(
      `INSERT INTO users (username, password, key, expiry_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, key, expiry_date`,
      [username.trim(), hashed, key, expiryDate]
    );

    const user = result.rows[0];

    // Create an empty config row for this user
    await pool.query(
      'INSERT INTO configs (user_id, configs) VALUES ($1, $2)',
      [user.id, JSON.stringify({})]
    );

    return res.json({
      success: true,
      user: {
        username: user.username,
        key: user.key,
        expiryDate: user.expiry_date,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
