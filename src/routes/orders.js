import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET /api/orders  (admin sees all; customer sees own) ──────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query(
        `SELECT o.*, u.name AS user_name, u.email AS user_email
         FROM orders o JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC`
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
      [req.params.id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found' });

    const order = orders[0];
    // check ownership
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [items] = await pool.query(
      `SELECT oi.id, oi.quantity, oi.unit_price, oi.subtotal,
              c.id AS coffee_id, c.name AS coffee_name, c.image_url
       FROM order_items oi JOIN coffees c ON c.id = oi.coffee_id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    return res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/orders ──────────────────────────────────────────────────────────
// Body: { note?: string, items: [{ coffee_id, quantity }] }
router.post('/', authenticate, async (req, res) => {
  const { note, items } = req.body;
  if (!items || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, message: 'items array required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate coffees + calculate total
    const coffeeIds = items.map(i => i.coffee_id);
    const [coffees] = await conn.query(
      'SELECT id, price, is_available FROM coffees WHERE id IN (?)',
      [coffeeIds]
    );

    const coffeeMap = {};
    coffees.forEach(c => { coffeeMap[c.id] = c; });

    let totalPrice = 0;
    for (const item of items) {
      const coffee = coffeeMap[item.coffee_id];
      if (!coffee) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Coffee ID ${item.coffee_id} not found` });
      }
      if (!coffee.is_available) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Coffee ID ${item.coffee_id} is not available` });
      }
      totalPrice += coffee.price * item.quantity;
    }

    // Insert order
    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, total_price, note) VALUES (?, ?, ?)',
      [req.user.id, totalPrice.toFixed(2), note || null]
    );
    const orderId = orderResult.insertId;

    // Insert order_items
    for (const item of items) {
      const unitPrice = coffeeMap[item.coffee_id].price;
      await conn.query(
        'INSERT INTO order_items (order_id, coffee_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.coffee_id, item.quantity, unitPrice]
      );
    }

    await conn.commit();
    return res.status(201).json({ success: true, orderId, totalPrice });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ── PATCH /api/orders/:id/status  (admin updates status) ─────────────────────
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'delivering', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    return res.json({ success: true, message: `Order status updated to '${status}'` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/orders/:id  (admin only) ──────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
