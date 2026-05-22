import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { 
    type: String, 
    enum: ['profit_daily', 'order_completed', 'admin_info'],
    default: 'admin_info'
  },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null }, // opsional
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
