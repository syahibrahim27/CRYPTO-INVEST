import { Router } from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js'; // pastikan export {auth}
import { ensureReferralCode, getTeamLevels } from '../utils/referral.js';

const router = Router();

// GET /api/team/me
router.get('/me', authMiddleware, async (req, res) => {
  const me = await User.findById(req.user.id);
  if (!me) return res.status(404).json({ message: 'User not found' });

  const code = await ensureReferralCode(me);
  const base =
  process.env.FRONTEND_BASE ||
  'https://crypto-invest-two.vercel.app/';
  const referralLink = `${base}/register.html?ref=${code}`;

  const levels = await getTeamLevels(me);

  res.json({
    referralCode: code,
    referralLink,
    counts: {
      level1: levels.L1.length,
      level2: levels.L2.length,
      level3: levels.L3.length,
      total: levels.total,
    },
    levels
  });
});

export default router;
