import jwt from 'jsonwebtoken';

// ── Verify access token ───────────────────────────────────────────────────────
export const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Require admin role ────────────────────────────────────────────────────────
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ── Allow only owner OR admin ─────────────────────────────────────────────────
export const requireOwnerOrAdmin = (req, res, next) => {
  const targetId = Number(req.params.id);
  if (req.user?.role === 'admin' || req.user?.id === targetId) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden' });
};
