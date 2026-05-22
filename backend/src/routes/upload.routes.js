import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import { authMiddleware } from '../middleware/auth.js'; // pastikan ada
const router = express.Router();

// Simpan file di memory (tidak di disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route upload ke Cloudinary
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file' });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'crypto-invest' },
      (error, result) => {
        if (error) return res.status(500).json({ message: error.message });
        return res.json({ url: result.secure_url, public_id: result.public_id });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
