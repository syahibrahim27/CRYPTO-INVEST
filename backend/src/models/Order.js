// src/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

  priceAtBuy:   { type: Number, required: true },
  roiPercent:   { type: Number, required: true },
  durationDays: { type: Number, required: true },

  status:  { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  startAt: { type: Date, default: Date.now },
  endAt:   { type: Date, required: true },

  lastProfitAt: { type: Date, default: null } ,
}, { timestamps: true });


export default mongoose.model('Order', orderSchema);
