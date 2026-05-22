// scripts/createAdmin.js
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config();
await connectDB();

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin123';
const phone = process.argv[4] || '08123456789';

const existing = await User.findOne({ username });
if (existing) {
  console.log('User sudah ada:', existing.username);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 10);
const user = await User.create({
  username,
  passwordHash,
  phone,
  role: 'admin',
  referralCode: 'ADMIN' + Math.random().toString(36).slice(2,6).toUpperCase()
});

console.log('✅ Admin created:', { username: user.username, role: user.role });
process.exit(0);
