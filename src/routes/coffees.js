import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET /api/coffees ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM coffees WHERE is_available = 1 ORDER BY category, name'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/coffees/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coffees WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Coffee not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/coffees (admin) ─────────────────────────────────────────────────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, message: 'name and price required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO coffees (name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, price, image_url || null, category || null]
    );
    return res.status(201).json({ success: true, coffeeId: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/coffees/:id (admin) ──────────────────────────────────────────────
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category, is_available } = req.body;
  try {
    await pool.query(
      'UPDATE coffees SET name=?, description=?, price=?, image_url=?, category=?, is_available=? WHERE id=?',
      [name, description, price, image_url, category, is_available ?? 1, req.params.id]
    );
    return res.json({ success: true, message: 'Coffee updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/coffees/:id (admin) ──────────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM coffees WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Coffee deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
