const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

// Middleware — all admin routes require x-admin-secret header
function requireAdmin(req, res, next) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

router.use(requireAdmin);

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, key, expiry_date, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error('[admin/users]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/users/:username — delete a user
router.delete('/users/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE LOWER(username) = LOWER($1) RETURNING username',
      [req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, deleted: result.rows[0].username });
  } catch (err) {
    console.error('[admin/delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/admin/users/:username/extend — extend expiry by N days
router.patch('/users/:username/extend', async (req, res) => {
  const { days } = req.body;

  if (!days || !Number.isInteger(days) || days <= 0) {
    return res.status(400).json({ success: false, message: 'days must be a positive integer' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET expiry_date = expiry_date + $1
       WHERE LOWER(username) = LOWER($2)
       RETURNING username, expiry_date`,
      [days * 24 * 60 * 60 * 1000, req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('[admin/extend]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/admin/users/:username/reset-key — generate a new license key
router.patch('/users/:username/reset-key', async (req, res) => {
  try {
    const rand = crypto.randomBytes(8).toString('hex').toUpperCase();
    const newKey = `PRESET-${req.params.username.toUpperCase()}-${rand}`;

    const result = await pool.query(
      `UPDATE users SET key = $1 WHERE LOWER(username) = LOWER($2)
       RETURNING username, key`,
      [newKey, req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('[admin/reset-key]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/admin/users/:username/password — reset password
router.patch('/users/:username/password', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'password is required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `UPDATE users SET password = $1 WHERE LOWER(username) = LOWER($2)
       RETURNING username`,
      [hashed, req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, updated: result.rows[0].username });
  } catch (err) {
    console.error('[admin/password]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
