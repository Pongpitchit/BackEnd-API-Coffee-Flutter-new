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
