import { Router } from 'express';
import Announcement from '../models/Announcement.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ADMIN: list semua pengumuman
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const list = await Announcement.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

// ADMIN: buat pengumuman baru
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { text, title, imageUrl, showAsPopup = true, expiresAt = null } = req.body;
  const a = await Announcement.create({ text, title, imageUrl, showAsPopup, expiresAt });
  res.json(a);
});

// ADMIN: edit pengumuman
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const a = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!a) return res.status(404).json({ message: 'Not found' });
  res.json(a);
});

// ADMIN: hapus pengumuman
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const a = await Announcement.findByIdAndDelete(req.params.id);
  if (!a) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

export default router;
