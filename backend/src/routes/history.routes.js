import { Router } from 'express';
import { authMiddleware  } from '../middleware/auth.js';
import History from '../models/History.js';

const router = Router();

// GET semua history user login
router.get('/me', authMiddleware, async (req, res) => {
  const list = await History.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(list);
});

// (Opsional) admin lihat semua history user tertentu
router.get('/admin/:userId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const list = await History.find({ userId: req.params.userId })
    .sort({ createdAt: -1 })
    .lean();
  res.json(list);
});

export default router;
