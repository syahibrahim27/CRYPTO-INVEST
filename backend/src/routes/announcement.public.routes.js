// backend/src/routes/announce.routes.js
import { Router } from 'express';
import Announcement from '../models/Announcement.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/* ===========================================
   🔹 USER SIDE (tanpa login)
   =========================================== */

// 1️⃣ Pengumuman aktif (popup)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const a = await Announcement.findOne({
      showAsPopup: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: -1 });
    res.json(a || null);
  } catch (err) {
    console.error('ACTIVE ANNOUNCEMENT ERROR:', err);
    res.status(500).json({ message: 'Gagal mengambil pengumuman aktif' });
  }
});

// 2️⃣ Daftar pengumuman publik
router.get('/list', async (req, res) => {
  try {
    const now = new Date();
    const list = await Announcement.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(list);
  } catch (err) {
    console.error('LIST ANNOUNCEMENT ERROR:', err);
    res.status(500).json({ message: 'Gagal mengambil daftar pengumuman' });
  }
});

/* ===========================================
   🔹 ADMIN SIDE (perlu login & role admin)
   =========================================== */

// 3️⃣ ADMIN: list semua pengumuman
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only' });

    const list = await Announcement.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('ADMIN LIST ERROR:', err);
    res.status(500).json({ message: 'Gagal mengambil data pengumuman' });
  }
});

// 4️⃣ ADMIN: buat pengumuman baru
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only' });

    const { text, title, imageUrl, showAsPopup = true, expiresAt = null } = req.body;
    if (!text) return res.status(400).json({ message: 'Text wajib diisi' });

    const a = await Announcement.create({
      text,
      title,
      imageUrl,
      showAsPopup,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.json(a);
  } catch (err) {
    console.error('ADMIN CREATE ERROR:', err);
    res.status(500).json({ message: 'Gagal membuat pengumuman' });
  }
});

// 5️⃣ ADMIN: edit pengumuman
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only' });

    const { text, title, imageUrl, showAsPopup, expiresAt } = req.body;
    const a = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(text !== undefined && { text }),
          ...(title !== undefined && { title }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(showAsPopup !== undefined && { showAsPopup }),
          ...(expiresAt !== undefined && { expiresAt }),
        },
      },
      { new: true }
    );

    if (!a) return res.status(404).json({ message: 'Pengumuman tidak ditemukan' });
    res.json(a);
  } catch (err) {
    console.error('ADMIN UPDATE ERROR:', err);
    res.status(500).json({ message: 'Gagal mengubah pengumuman' });
  }
});

// 6️⃣ ADMIN: hapus pengumuman
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only' });

    const a = await Announcement.findByIdAndDelete(req.params.id);
    if (!a) return res.status(404).json({ message: 'Pengumuman tidak ditemukan' });

    res.json({ ok: true });
  } catch (err) {
    console.error('ADMIN DELETE ERROR:', err);
    res.status(500).json({ message: 'Gagal menghapus pengumuman' });
  }
});

export default router;
