// src/middleware/roles.js
import User from '../models/User.js';

export async function adminOnly(req, res, next) {
  try {
    // Jika role sudah ada di token (auth.js bisa menaruhnya), pakai langsung
    if (req.user?.role === 'admin') return next();

    // Fall back: cek ke DB
    const u = await User.findById(req.user?.id).select('role');
    if (!u) return res.status(401).json({ message: 'Unauthorized' });
    if (u.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    next();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}
