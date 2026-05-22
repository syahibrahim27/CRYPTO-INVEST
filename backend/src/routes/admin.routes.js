// src/routes/admin.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roles.js';
import User from '../models/User.js';
import BalanceLog from '../models/Balancelog.js';
import Announcement from '../models/Announcement.js';
import History from '../models/History.js';

const router = Router();

/** USERS */
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await User.find().select('username phone balance role referralCode referredBy createdAt');
  res.json(users);
});

router.get('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  const u = await User.findById(req.params.id).select('username phone balance role referralCode referredBy bank contacts');
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json(u);
});

router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  const allow = ['username', 'phone', 'role', 'referredBy', 'contacts', 'bank'];
  const patch = {};
  allow.forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
  const u = await User.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json(u);
});

/** ✅ Adjust balance with reason + History log */
router.post('/users/:id/balance', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { delta, reason } = req.body; // delta bisa +/- (contoh: 100000 atau -50000)
    if (!delta || !reason) {
      return res.status(400).json({ message: 'delta dan reason wajib' });
    }

    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    const oldBalance = u.balance || 0;
    const newBalance = oldBalance + Number(delta);

    u.balance = newBalance;
    await u.save();

    await BalanceLog.create({
      userId: u._id,
      delta: Number(delta),
      reason: String(reason),
    });

    // 🧾 Tambah log ke History
    await History.create({
      userId: u._id,
      type: 'admin_adjust',
      amount: Number(delta),
      description: `Penyesuaian saldo oleh admin (${reason || 'update manual'})`,
      balanceAfter: newBalance,
    });

    res.json({ message: 'Saldo diubah', balance: newBalance });
  } catch (err) {
    console.error('❌ Error adjust balance:', err.message);
    res.status(500).json({ message: err.message });
  }
});

/** ANNOUNCEMENTS */
router.get('/announce', authMiddleware, adminOnly, async (req, res) => {
  const list = await Announcement.find().sort({ createdAt: -1 }).limit(50);
  res.json(list);
});

router.post('/announce', authMiddleware, adminOnly, async (req, res) => {
  const { text, title, imageUrl, showAsPopup = true, expiresAt = null } = req.body;
  if (!text) return res.status(400).json({ message: 'Text wajib' });
  const a = await Announcement.create({
    text,
    title,
    imageUrl,
    showAsPopup,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });
  res.json(a);
});

export default router;
