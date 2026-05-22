// src/models/User.js
import mongoose from 'mongoose';

const bankSchema = new mongoose.Schema({
  bankName: String,
  accountNumber: String,
  accountHolder: String
}, { _id: false });

const contactSchema = new mongoose.Schema({
  whatsapp: String,
  email: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, trim: true },                  // ✅ nomor HP user
 balanceDeposit: { type: Number, default: 0 },     // uang dari deposit
  balanceWithdrawable: { type: Number, default: 0 }, // hasil produk + bonus reff                // ✅ saldo user
  referralCode: { type: String, unique: true },         // ✅ kode reff user
  referredBy: { type: String, default: null },  
  // tambahkan field di schema user:
role: { type: String, enum: ['user', 'admin'], default: 'user' },
        // ✅ kode reff upline
  bank: bankSchema,                                     // ✅ data rekening bank
  contacts: contactSchema                               // ✅ opsional (whatsapp/email)
}, { timestamps: true });

export default mongoose.model('User', userSchema);
