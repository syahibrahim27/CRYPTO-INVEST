import User from '../models/User.js';

// pastikan user punya referralCode
export async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  user.referralCode = code;
  await user.save();
  return code;
}

// ambil 3 upline (L1-L3) berdasarkan chain referredBy (via referralCode)
export async function getUplines(user) {
  const levels = [];
  let currentCode = user.referredBy || null;
  for (let i = 0; i < 3 && currentCode; i++) {
    const upline = await User.findOne({ referralCode: currentCode });
    if (!upline) break;
    levels.push(upline);
    currentCode = upline.referredBy || null;
  }
  // levels[0] = L1, [1] = L2, [2] = L3
  return levels;
}

// statistik tim (L1, L2, L3)
export async function getTeamLevels(me) {
  // Level 1 = orang yang referredBy == myCode
  const L1 = await User.find({ referredBy: me.referralCode }, 'username referralCode createdAt').lean();

  // Level 2 = orang yang referredBy == code milik L1
  const L1Codes = L1.map(u => u.referralCode);
  const L2 = L1Codes.length
    ? await User.find({ referredBy: { $in: L1Codes } }, 'username referralCode createdAt').lean()
    : [];

  // Level 3 = orang yang referredBy == code milik L2
  const L2Codes = L2.map(u => u.referralCode);
  const L3 = L2Codes.length
    ? await User.find({ referredBy: { $in: L2Codes } }, 'username referralCode createdAt').lean()
    : [];

  return { L1, L2, L3, total: L1.length + L2.length + L3.length };
}
