import mongoose from 'mongoose';

const withdrawSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:  { type: Number, required: true },
  bankSnap: { // snapshot rekening saat request
    bankName: String,
    accountNumber: String,
    accountHolder: String
  },
  status:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  note:    { type: String }
}, { timestamps: true });

export default mongoose.model('Withdraw', withdrawSchema);
