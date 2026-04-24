import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, requireAdmin, requireOwnerOrAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET /api/users  (admin only) ─────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role, created_at FROM users ORDER BY id'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/users/:id  (owner or admin) ─────────────────────────────────────
router.get('/:id', authenticate, requireOwnerOrAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/users  (admin creates user manually) ───────────────────────────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email, password required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, phone || null, role || 'customer']
    );
    return res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already exists' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/users/:id  (owner or admin — profile update) ──────────────────
router.patch('/:id', authenticate, requireOwnerOrAdmin, async (req, res) => {
  const { name, phone, avatar_url, password } = req.body;
  const updates = [];
  const values  = [];

  if (name)       { updates.push('name = ?');       values.push(name); }
  if (phone)      { updates.push('phone = ?');      values.push(phone); }
  if (avatar_url) { updates.push('avatar_url = ?'); values.push(avatar_url); }
  if (password)   {
    const hash = await bcrypt.hash(password, 10);
    updates.push('password = ?');
    values.push(hash);
  }

  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }

  values.push(req.params.id);

  try {
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/users/:id  (admin only) ──────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/users/:id/orders  (order history with items) ────────────────────
router.get('/:id/orders', authenticate, requireOwnerOrAdmin, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.status, o.total_price, o.note, o.created_at, o.updated_at
       FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
      [req.params.id]
    );

    if (!orders.length) return res.json({ success: true, data: [] });

    // Fetch items for each order in one query
    const orderIds = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT oi.order_id, oi.id, oi.quantity, oi.unit_price, oi.subtotal,
              c.id AS coffee_id, c.name AS coffee_name, c.image_url
       FROM order_items oi
       JOIN coffees c ON c.id = oi.coffee_id
       WHERE oi.order_id IN (?)`,
      [orderIds]
    );

    // Group items by order_id
    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    const result = orders.map(o => ({ ...o, items: itemsByOrder[o.id] || [] }));
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/users/me  (shortcut for profile page) ───────────────────────────
router.get('/me/profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
