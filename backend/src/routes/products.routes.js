import { Router } from 'express';
import Product from '../models/Product.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roles.js';

const router = Router();

// Public: list & detail
router.get('/', async (req, res) => {
  const list = await Product.find().sort({ createdAt: -1 });
  res.json(list);
});
router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(p);
});

// Admin only: create, update, delete
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const p = await Product.create(req.body);
  res.json(p);
});
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!p) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(p);
});
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json({ message: 'Produk dihapus' });
});

export default router;
