import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes    from './routes/auth.js';
import userRoutes    from './routes/users.js';
import coffeeRoutes  from './routes/coffees.js';
import orderRoutes   from './routes/orders.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Temp Route: Update User Role ───────────────────────────────────────────────
app.post('/api/temp-update-role', async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ success: false, message: 'email and role required' });
  }
  try {
    const pool = (await import('./config/db.js')).default;
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE email = ?',
      [role, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Override Register Route to Support Role ────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email, password required' });
  }

  try {
    const pool = (await import('./config/db.js')).default;
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, phone || null, role || 'customer']
    );

    return res.status(201).json({ success: true, message: 'Registered', userId: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/coffees', coffeeRoutes);
app.use('/api/orders',  orderRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Coffee Shop API v2.0', timestamp: new Date() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`☕  Coffee Shop API running on port ${PORT}`);
});

export default app;
