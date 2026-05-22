// src/routes/wallet.routes.js
import express from 'express';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import Withdraw from '../models/Withdraw.js';
import History from '../models/History.js';
import { authMiddleware as auth } from '../middleware/auth.js';

const router = express.Router();

/* ============================================================
   🔹 GET saldo & rekening user
   ============================================================ */
// GET /api/wallet/balance
router.get('/balance', auth, async (req, res) => {
  const me = await User.findById(req.user.id).lean();
  if (!me) return res.status(404).json({ message: 'User tidak ditemukan' });

  const balanceDeposit = me.balanceDeposit || 0;
  const balanceWithdrawable = me.balanceWithdrawable || 0;
  const total = balanceDeposit + balanceWithdrawable;

  res.json({
    username: me.username,
    balanceDeposit,
    balanceWithdrawable,
    total,
    bank: me.bank || null,
  });
});


/* ============================================================
   🔹 POST simpan / update rekening
   ============================================================ */
router.post('/bank', auth, async (req, res) => {
  try {
    const { bankName, accountNumber, accountHolder } = req.body;
    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({ message: 'Semua field rekening wajib diisi' });
    }

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: 'User not found' });

    me.bank = { bankName, accountNumber, accountHolder };
    await me.save();
    res.json({ message: 'Rekening disimpan', bank: me.bank });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   🔹 USER KIRIM PERMINTAAN DEPOSIT
   ============================================================ */
// POST /api/wallet/deposit
router.post('/deposit', auth, async (req, res) => {
  const { amount, method, meta } = req.body;

  if (!amount || amount < 50000)
    return res.status(400).json({ message: 'Minimal deposit Rp50.000' });

  const me = await User.findById(req.user.id);
  if (!me) return res.status(404).json({ message: 'User tidak ditemukan' });

  const dep = await Deposit.create({
    userId: me._id,
    amount,
    method,
    meta,
    status: 'pending'
  });

  res.json({
    message: 'Permintaan deposit dikirim. Tunggu konfirmasi admin.',
    deposit: dep
  });
});


/* ============================================================
   🔹 ADMIN APPROVE DEPOSIT
   ============================================================ */
// POST /api/wallet/deposit
router.post('/admin/deposit/:id/approve', auth, async (req, res) => {
  const dep = await Deposit.findById(req.params.id).populate('userId');
  if (!dep) return res.status(404).json({ message: 'Deposit tidak ditemukan' });
  if (dep.status !== 'pending') return res.status(400).json({ message: 'Deposit sudah diproses' });

  const user = dep.userId;

  // ✅ Masuk ke balanceDeposit saja
  user.balanceDeposit += dep.amount;
  await user.save();

  dep.status = 'approved';
  await dep.save();

  await History.create({
    userId: user._id,
    type: 'deposit',
    amount: dep.amount,
    description: `Deposit melalui ${dep.method}`,
    balanceAfter: user.balanceDeposit + user.balanceWithdrawable
  });

  res.json({ message: 'Deposit disetujui', deposit: dep });
});


/* ============================================================
   🔹 ADMIN REJECT DEPOSIT
   ============================================================ */
router.post('/admin/deposit/:id/reject', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Hanya admin' });

  const dep = await Deposit.findById(req.params.id);
  if (!dep || dep.status !== 'pending')
    return res.status(400).json({ message: 'Deposit tidak valid' });

  dep.status = 'rejected';
  await dep.save();

  res.json({ message: 'Deposit ditolak' });
});

/* ============================================================
   🔹 USER KIRIM PERMINTAAN WITHDRAW
   ============================================================ */
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 50000)
      return res.status(400).json({ message: 'Minimal withdraw Rp50.000' });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: 'User not found' });

    if (!me.bank || !me.bank.bankName || !me.bank.accountNumber || !me.bank.accountHolder) {
      return res.status(400).json({ message: 'Lengkapi rekening terlebih dahulu' });
    }

    if (me.balanceWithdrawable < amount)
      return res.status(400).json({ message: 'Saldo penarikan tidak cukup' });

    // Kurangi saldo sementara
    me.balanceWithdrawable -= amount;
    await me.save();

    const wd = await Withdraw.create({
      userId: me._id,
      amount,
      bankSnap: me.bank,
      status: 'pending',
    });

    await History.create({
      userId: me._id,
      type: 'withdraw',
      amount: -amount,
      description: 'Permintaan withdraw menunggu persetujuan admin',
      balanceAfter: me.balanceDeposit + me.balanceWithdrawable,
    });

    res.json({ message: 'Permintaan withdraw dikirim', withdraw: wd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   🔹 ADMIN: approve / reject withdraw
   ============================================================ */
router.get('/admin/withdraws', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin only' });

  const status = req.query.status || 'pending';
  const list = await Withdraw.find({ status })
    .populate('userId', 'username')
    .sort({ createdAt: -1 });
  res.json(list);
});

router.post('/admin/withdraw/:id/approve', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Hanya admin' });

  const wd = await Withdraw.findById(req.params.id).populate('userId');
  if (!wd || wd.status !== 'pending')
    return res.status(400).json({ message: 'Withdraw tidak valid' });

  wd.status = 'approved';
  await wd.save();

  await History.create({
    userId: wd.userId._id,
    type: 'withdraw',
    amount: -wd.amount,
    description: 'Withdraw disetujui admin',
    balanceAfter: wd.userId.balanceDeposit + wd.userId.balanceWithdrawable,
  });

  res.json({ message: 'Withdraw disetujui' });
});

router.post('/admin/withdraw/:id/reject', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Hanya admin' });

  const wd = await Withdraw.findById(req.params.id).populate('userId');
  if (!wd || wd.status !== 'pending')
    return res.status(400).json({ message: 'Withdraw tidak valid' });

  wd.status = 'rejected';
  await wd.save();

  wd.userId.balanceWithdrawable += wd.amount;
  await wd.userId.save();

  await History.create({
    userId: wd.userId._id,
    type: 'withdraw',
    amount: wd.amount,
    description: 'Withdraw ditolak, saldo dikembalikan',
    balanceAfter: wd.userId.balanceDeposit + wd.userId.balanceWithdrawable,
  });

  res.json({ message: 'Withdraw ditolak & saldo dikembalikan' });
});

export default router;
