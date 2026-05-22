// backend/src/cron/dailyProfit.js
import cron from 'node-cron';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// ====== Import model lengkap (wajib sebelum connect) ======
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import History from '../models/History.js';
import Notification from '../models/Notification.js';
import { getUplines } from '../utils/referral.js';

dotenv.config();

/**
 * 🔹 Fungsi utama untuk memproses profit harian
 */
export async function processDailyProfit() {
  const now = new Date();
  console.log('🚀 Mulai distribusi profit harian:', now.toLocaleString('id-ID'));

  // Pastikan model sudah terdaftar di mongoose connection
  if (!mongoose.models.Product) mongoose.model('Product', Product.schema);
  if (!mongoose.models.Order) mongoose.model('Order', Order.schema);
  if (!mongoose.models.User) mongoose.model('User', User.schema);
  if (!mongoose.models.History) mongoose.model('History', History.schema);
  if (!mongoose.models.Notification) mongoose.model('Notification', Notification.schema);

  const orders = await Order.find({ status: 'active' }).populate('userId productId');
  let processed = 0;

  for (const o of orders) {
    try {
      const start = new Date(o.startAt);
      const end = new Date(o.endAt);

      // ✅ Jika masa aktif sudah selesai
      if (now >= end) {
        o.status = 'completed';
        await o.save();

        await Notification.create({
          userId: o.userId._id,
          type: 'order_completed',
          title: 'Paket Selesai',
          message: `Paket ${o.productId?.name || 'investasi'} telah selesai.`,
        });

        continue;
      }

      // ✅ Lewati jika sudah dapat profit hari ini
      const lastPaid = o.lastProfitAt ? new Date(o.lastProfitAt) : new Date(0);
      if (lastPaid.toDateString() === now.toDateString()) continue;

      // ✅ Hitung profit harian
      const totalProfit = o.priceAtBuy * (o.roiPercent / 100);
      const dailyProfit = Math.floor(totalProfit / o.durationDays);

      // ✅ Tambahkan profit ke saldo withdrawable
      const user = await User.findById(o.userId._id);
      if (!user) continue;
      user.balanceWithdrawable += dailyProfit;
      await user.save();

      // Catat ke history
      await History.create({
        userId: user._id,
        type: 'profit_daily',
        amount: dailyProfit,
        description: `Profit harian dari ${o.productId?.name || 'investasi'}`,
        balanceAfter: user.balanceDeposit + user.balanceWithdrawable,
      });

      await Notification.create({
        userId: user._id,
        type: 'profit_daily',
        title: 'Profit Harian Masuk',
        message: `Saldo bertambah Rp${dailyProfit.toLocaleString('id-ID')} dari ${o.productId?.name || 'investasi'}.`,
      });

      // ✅ Bonus referral (10%, 6%, 3%)
      const uplines = await getUplines(user);
      const bonuses = [0.10, 0.06, 0.03];

      for (let i = 0; i < uplines.length; i++) {
        const up = uplines[i];
        if (!up) continue;

        const bonus = Math.floor(dailyProfit * bonuses[i]);
        if (bonus <= 0) continue;

        up.balanceWithdrawable += bonus;
        await up.save();

        await History.create({
          userId: up._id,
          type: 'bonus_ref_profit',
          amount: bonus,
          description: `Bonus ${bonuses[i] * 100}% dari profit ${user.username}`,
          balanceAfter: up.balanceDeposit + up.balanceWithdrawable,
        });

        await Notification.create({
          userId: up._id,
          type: 'profit_daily',
          title: 'Bonus Referral Harian',
          message: `Bonus ${bonuses[i] * 100}% dari profit ${user.username}: Rp${bonus.toLocaleString('id-ID')}.`,
        });
      }

      o.lastProfitAt = now;
      await o.save();
      processed++;
    } catch (err) {
      console.error(`❌ Error memproses order ${o._id}:`, err.message);
    }
  }

  console.log(`✅ Selesai distribusi profit harian & bonus referral. (${processed} order diproses)`);
}

/**
 * 🔹 Jalankan cron otomatis setiap jam 00:00 WIB
 */
export function startDailyProfitJob() {
  console.log('🕒 Cron profit harian aktif setiap 00:00 WIB');
  cron.schedule('0 0 * * *', async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto_invest');
      await processDailyProfit();
      await mongoose.disconnect();
    } catch (err) {
      console.error('[CRON ERROR]', err);
      await mongoose.disconnect();
    }
  }, {
    timezone: 'Asia/Jakarta'
  });
}

/**
 * 🔹 Jalankan manual kalau ingin test cepat
 *   (npm run cron atau node src/cron/dailyProfit.js)
 */
if (process.argv[1].includes('dailyProfit.js')) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto_invest');
      await processDailyProfit();
      await mongoose.disconnect();
    } catch (err) {
      console.error('[MANUAL ERROR]', err);
      await mongoose.disconnect();
    }
  })();
}
