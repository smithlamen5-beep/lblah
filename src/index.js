require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const authRoutes   = require('./routes/auth');
const configRoutes = require('./routes/config');
const adminRoutes  = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', configRoutes);
app.use('/api/admin', adminRoutes);

// Health check — Railway uses this to confirm the service is up
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'preset-api' });
});

// Start
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[preset-api] running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[startup] failed:', err);
    process.exit(1);
  }
}

start();
