// src/routes/wallet.admin.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roles.js';
import Deposit from '../models/Deposit.js';
import Withdraw from '../models/Withdraw.js';
import User from '../models/User.js';
import BalanceLog from '../models/Balancelog.js';
import History from '../models/History.js';

const router = Router();

/** List deposit pending/semua (opsional filter ?status=pending) */
router.get('/deposits', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const list = await Deposit.find(q).populate('userId', 'username').sort({ createdAt: -1 });
  res.json(list);
});

/** Approve deposit */
router.post('/deposit/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  const dep = await Deposit.findById(req.params.id);
  if (!dep) return res.status(404).json({ message: 'Deposit not found' });
  if (dep.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

  const user = await User.findById(dep.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // tambah saldo
  user.balance += dep.amount;
  await user.save();


  await History.create({
    userId: user._id,
    type: 'deposit',
    amount: dep.amount,
    description: `Deposit melalui ${dep.method}`,
    balanceAfter: user.balance
  });


  // log
  await BalanceLog.create({ userId: user._id, delta: dep.amount, reason: 'Deposit approved' });

  dep.status = 'approved';
  await dep.save();

  res.json({ message: 'Deposit approved', balance: user.balance });
});



/** Reject deposit */
router.post('/deposit/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const dep = await Deposit.findById(req.params.id);
  if (!dep) return res.status(404).json({ message: 'Deposit not found' });
  if (dep.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
  dep.status = 'rejected';
  await dep.save();
  res.json({ message: 'Deposit rejected' });
});

/** (Opsional) Withdraw: list & approve/reject */
router.get('/withdraws', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const list = await Withdraw.find(q).populate('userId', 'username balance').sort({ createdAt: -1 });
  res.json(list);
});

router.post('/withdraw/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  const wd = await Withdraw.findById(req.params.id);
  if (!wd) return res.status(404).json({ message: 'Withdraw not found' });
  if (wd.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

  const user = await User.findById(wd.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Kurangi saldo saat aproval (kalau saat request belum dikurangi)
  if (user.balance < wd.amount) return res.status(400).json({ message: 'Saldo user tidak cukup' });
  user.balance -= wd.amount;
  await user.save();

// setelah update saldo user
await History.create({
  userId: user._id,
  type: 'withdraw',
  amount: -amount,
  description: 'Withdraw ke rekening',
  balanceAfter: user.balance
});


  await BalanceLog.create({ userId: user._id, delta: -wd.amount, reason: 'Withdraw approved' });

  wd.status = 'approved';
  await wd.save();

  res.json({ message: 'Withdraw approved', balance: user.balance });
});

router.post('/withdraw/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const wd = await Withdraw.findById(req.params.id);
  if (!wd) return res.status(404).json({ message: 'Withdraw not found' });
  if (wd.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
  wd.status = 'rejected';
  await wd.save();
  res.json({ message: 'Withdraw rejected' });
});

export default router;
