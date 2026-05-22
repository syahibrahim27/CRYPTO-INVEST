import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto_invest';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB lokal terhubung di', uri);
  } catch (err) {
    console.error('❌ Gagal konek MongoDB:', err.message);
    process.exit(1);
  }
}
