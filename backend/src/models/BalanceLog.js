import mongoose from 'mongoose';

const balanceLogSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delta:   { type: Number, required: true }, // + / -
  reason:  { type: String, required: true }, // keterangan admin
}, { timestamps: true });

export default mongoose.model('BalanceLog', balanceLogSchema);
