const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

// Helper — authenticate user from username + password in body
async function authenticateUser(username, password) {
  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
    [username.trim()]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return null;

  return user;
}

// POST /api/save-config
router.post('/save-config', async (req, res) => {
  const { username, password, configs } = req.body;

  if (!username || !password || !configs) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await pool.query(
      `INSERT INTO configs (user_id, configs, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET configs = $2, updated_at = $3`,
      [user.id, JSON.stringify(configs), Date.now()]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[save-config]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/load-config
router.post('/load-config', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const result = await pool.query(
      'SELECT configs FROM configs WHERE user_id = $1',
      [user.id]
    );

    const configs = result.rows.length > 0 ? result.rows[0].configs : {};

    return res.json({ success: true, configs });
  } catch (err) {
    console.error('[load-config]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
