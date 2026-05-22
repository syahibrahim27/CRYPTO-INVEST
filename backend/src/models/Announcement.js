// src/models/Announcement.js
import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { 
    type: String, 
    default: 'Pengumuman' 
  },                       // Judul pengumuman
  text: { 
    type: String, 
    required: true, 
    trim: true 
  },                       // Isi teks utama
  imageUrl: { 
    type: String, 
    default: '' 
  },                       // URL gambar (opsional)
  showAsPopup: { 
    type: Boolean, 
    default: true 
  },                       // Ditampilkan sebagai popup di halaman home
  expiresAt: { 
    type: Date, 
    default: null 
  },                       // null = tidak kadaluarsa
}, { 
  timestamps: true 
});

// Optional: tambahkan index otomatis untuk membersihkan pengumuman kadaluarsa
announcementSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } }
);

export default mongoose.model('Announcement', announcementSchema);
