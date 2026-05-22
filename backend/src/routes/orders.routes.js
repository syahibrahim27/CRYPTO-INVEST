// src/routes/orders.routes.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import History from '../models/History.js';
import { getUplines } from '../utils/referral.js';

const router = Router();

/**
 * POST /api/orders/buy/:id
 * Membeli produk:
 * - Validasi ID
 * - Cek saldo deposit user
 * - Buat order baru
 * - Tambahkan profit pertama
 * - Berikan bonus referral
 */
router.post('/buy/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validasi ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Produk ID tidak valid' });
    }

    // Ambil produk
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });

    // Ambil user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    // Cek saldo deposit
    if ((user.balanceDeposit || 0) < product.price) {
      return res.status(400).json({ message: 'Saldo deposit tidak cukup' });
    }

    // Kurangi saldo deposit
    user.balanceDeposit -= product.price;
    await user.save();

    // Buat order baru
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + Number(product.durationDays || 0));

    const order = await Order.create({
      userId: user._id,
      productId: product._id,
      priceAtBuy: product.price,
      roiPercent: product.roiPercent,
      durationDays: product.durationDays,
      startAt,
      endAt,
      status: 'active',
      lastProfitAt: startAt,
    });

    // 💰 Profit pertama
    const totalProfit = product.price * (product.roiPercent / 100);
    const dailyProfit = totalProfit / product.durationDays;

    user.balanceWithdrawable += dailyProfit;
    await user.save();

    await History.create({
      userId: user._id,
      type: 'profit_daily',
      amount: dailyProfit,
      description: `Profit hari pertama dari ${product.name}`,
      balanceAfter: user.balanceDeposit + user.balanceWithdrawable,
    });

    // 💸 Bonus referral (10%, 6%, 3%)
    const uplines = await getUplines(user);
    const bonuses = [0.1, 0.06, 0.03];

    for (let i = 0; i < uplines.length; i++) {
      const up = uplines[i];
      const bonus = dailyProfit * bonuses[i];
      if (!up || bonus <= 0) continue;

      up.balanceWithdrawable += bonus;
      await up.save();

      await History.create({
        userId: up._id,
        type: 'bonus_ref_profit',
        amount: bonus,
        description: `Bonus ${bonuses[i] * 100}% dari profit ${user.username}`,
        balanceAfter: up.balanceDeposit + up.balanceWithdrawable,
      });
    }

    res.json({ message: 'Pembelian berhasil dan profit pertama masuk.', order });
  } catch (err) {
    console.error('BUY ERROR:', err);
    res.status(500).json({ message: 'Gagal membeli produk.' });
  }
});

/**
 * GET /api/orders/mine
 * Menampilkan daftar order user yang sedang login
 */
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await Order.find({ userId })
      .populate('productId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('MINE ERROR:', err);
    res.status(500).json({ message: 'Gagal mengambil data order' });
  }
});

export default router;
