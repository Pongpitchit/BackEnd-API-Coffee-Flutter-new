import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = Router();

const signAccess  = (payload) => jwt.sign(payload, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN         || '15m' });
const signRefresh = (payload) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'  });

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email, password required' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hash, phone || null]
    );

    return res.status(201).json({ success: true, message: 'Registered', userId: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email and password required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh(payload);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refreshToken]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });

    // Rotate: delete old, issue new
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

    const newPayload      = { id: payload.id, email: payload.email, role: payload.role };
    const newAccessToken  = signAccess(newPayload);
    const newRefreshToken = signRefresh(newPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [payload.id, newRefreshToken, expiresAt]
    );

    return res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]).catch(() => {});
  }
  return res.json({ success: true, message: 'Logged out' });
});

export default router;
