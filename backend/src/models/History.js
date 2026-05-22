import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['deposit', 'withdraw', 'bonus_ref_depo', 'bonus_ref_profit', 'profit_daily', 'admin_adjust'],
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  balanceAfter: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('History', historySchema);
