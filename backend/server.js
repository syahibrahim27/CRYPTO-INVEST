// ======== Import ========
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron';
import mongoose from 'mongoose';

import connectDB from './src/config/db.js';

import authRoutes from './src/routes/auth.routes.js';
import productRoutes from './src/routes/products.routes.js';
import orderRoutes from './src/routes/orders.routes.js';
import walletRoutes from './src/routes/wallet.routes.js';
import teamRoutes from './src/routes/team.routes.js';
import newsRoutes from './src/routes/news.routes.js';
import walletAdminRoutes from './src/routes/wallet.admin.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import announcementPublicRoutes from './src/routes/announcement.public.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import historyRoutes from './src/routes/history.routes.js';
import announcementAdminRoutes from './src/routes/announcement.admin.routes.js';
import newsExternalRoutes from './src/routes/news.external.routes.js';

// NOTE: Tidak mengimpor startDailyProfitJob / processDailyProfit agar tidak dobel cron
// import { startDailyProfitJob, processDailyProfit } from './src/cron/dailyProfit.js';

import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import User from './src/models/User.js';

// ======== Load ENV ========
dotenv.config();

// ======== Init App ========
const app = express();
const PORT = process.env.PORT || 5000;

// ======== Middlewares ========
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ======== Connect DB ========
await connectDB(); // pastikan Node 18+ & "type": "module" di package.json

// ======== Seed Produk Default ========
(async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany([
        {
          name: 'Crypto Starter',
          price: 50000,
          durationDays: 7,
          roiPercent: 5,
          imageUrl: 'https://images.unsplash.com/photo-1625225233840-695456021cde?w=800',
          description: 'Paket pemula untuk mengenal investasi harian.',
        },
        {
          name: 'Aurora Plus',
          price: 200000,
          durationDays: 15,
          roiPercent: 15,
          imageUrl: 'https://images.unsplash.com/photo-1643988442358-4bdde02a6fb3?w=800',
          description: 'Paket performa menengah dengan ROI menarik.',
        },
        {
          name: 'Nebula Pro',
          price: 500000,
          durationDays: 30,
          roiPercent: 40,
          imageUrl: 'https://images.unsplash.com/photo-1639322537529-9242bcb2486d?w=800',
          description: 'Paket unggulan untuk hasil maksimal.',
        },
      ]);
      console.log('✅ Seeded default products');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
})();

// ======== Routes ========
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/wallet/admin', walletAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announce', announcementPublicRoutes); // untuk publik (home)
app.use('/api/admin/announce', announcementAdminRoutes); // untuk admin panel
app.use('/api/upload', uploadRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', newsExternalRoutes);

// ======== Health Check ========
app.get('/', (req, res) => res.json({ ok: true, service: 'Crypto Invest API' }));

// ======== Start Server ========
const server = app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
);

// ======== Daily Profit CRON ========
console.log('[INIT] Daily profit cron activated');

/**
 * Jalan setiap hari jam 00:00 WIB (Asia/Jakarta).
 * Cron format: "m h dom mon dow"
 * "0 0 * * *" = 00:00 setiap hari
 */
cron.schedule(
  '0 0 * * *',
  async () => {
    try {
      const now = new Date();
      console.log(`[CRON] Jalankan profit harian: ${now.toLocaleString('id-ID')}`);

      // Ambil order aktif
      const activeOrders = await Order.find({ status: 'active' }).populate('userId');

      for (const order of activeOrders) {
        const { userId, priceAtBuy, roiPercent, durationDays, startAt, endAt, lastProfitAt } = order;

        // Jika melewati masa aktif -> selesaikan
        if (endAt && now >= new Date(endAt)) {
          order.status = 'completed';
          await order.save();
          console.log(`[CRON] Order selesai untuk user ${userId?.username || userId}`);
          continue;
        }

        // Hitung selisih hari sejak terakhir profit
        const last = lastProfitAt ? new Date(lastProfitAt) : new Date(startAt);
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

        if (diffDays >= 1) {
          const totalProfit = priceAtBuy * (roiPercent / 100);
          const dailyProfit = totalProfit / durationDays;

          // Tambahkan profit ke saldo user
          await User.findByIdAndUpdate(userId._id, { $inc: { balance: dailyProfit } });

          order.lastProfitAt = now;
          await order.save();

          console.log(
            `[CRON] + Profit harian ${dailyProfit.toFixed(0)} ke ${userId?.username || userId}`
          );
        }
      }

      console.log('[CRON] Profit harian selesai diproses ✅');
    } catch (err) {
      console.error('[CRON ERROR]', err);
    }
  },
  { timezone: 'Asia/Jakarta' }
);

// ======== Graceful Shutdown ========
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close();
    process.exit(0);
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
