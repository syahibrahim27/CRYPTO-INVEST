// ======== Import Utama ========
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import svgCaptcha from 'svg-captcha';
import User from '../models/User.js';

dotenv.config();

const router = Router();

// ======== Konstanta Captcha ========
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'captcha-secret-key';

// util: bikin hash jawaban
function hashAns(ans) {
  return crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(String(ans || '').trim().toLowerCase())
    .digest('hex');
}

// ======== Endpoint: GET /api/auth/captcha ========
router.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 6,
    ignoreChars: '0Oo1Il',
    noise: 3,
    color: true,
    background: '#d0eff2'
  });

  const h = hashAns(captcha.text);
  const token = jwt.sign({ h }, CAPTCHA_SECRET, { expiresIn: '5m' }); // kadaluarsa 5 menit
  const svgBase64 = Buffer.from(captcha.data).toString('base64');

  res.json({
    token,
    image: `data:image/svg+xml;base64,${svgBase64}`
  });
});

// ======== Util Lama ========
const phoneOk = (s = '') =>
  /^(\+?62|62|0)8[1-9][0-9]{7,11}$/.test(String(s).replace(/\s|-/g, ''));
const genRef = (len = 8) =>
  Math.random().toString(36).slice(2, 2 + len).toUpperCase();

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      refCode: user.referralCode,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '7d' }
  );
}

/**
 * REGISTER (role default: user)
 * Jika kirim body.adminSecret == process.env.ADMIN_SETUP_TOKEN -> role: 'admin'
 */
router.post('/register', async (req, res) => {
  try {
    // Ambil dari body: captchaToken, captchaAnswer juga
    const {
      username,
      password,
      phone,
      referredBy,
      adminSecret,
      captchaToken,
      captchaAnswer
    } = req.body;

    // Validasi captcha
    try {
      const payload = jwt.verify(captchaToken, CAPTCHA_SECRET);
      const ok = payload?.h && payload.h === hashAns(captchaAnswer);
      if (!ok)
        return res.status(400).json({ message: 'Captcha salah atau kadaluarsa.' });
    } catch (e) {
      return res.status(400).json({ message: 'Captcha tidak valid.' });
    }

    // ======== Validasi Awal ========
    if (!username || !password || !phone) {
      return res
        .status(400)
        .json({ message: 'username, password, dan phone wajib' });
    }
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: 'Password minimal 6 karakter' });
    if (!phoneOk(phone))
      return res.status(400).json({ message: 'Format no HP tidak valid' });

    const exists = await User.findOne({ username });
    if (exists)
      return res.status(400).json({ message: 'Username sudah dipakai' });

    // ======== Buat Akun ========
    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = genRef();
    const role =
      adminSecret && adminSecret === (process.env.ADMIN_SETUP_TOKEN || '')
        ? 'admin'
        : 'user';

    const user = await User.create({
      username: username.trim(),
      phone: phone.trim(),
      passwordHash,
      referralCode,
      referredBy: referredBy || null,
      role
    });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role
      }
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/** LOGIN */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'username & password wajib' });

    const u = await User.findOne({ username });
    if (!u)
      return res.status(401).json({ message: 'Username atau password salah' });

    const ok = await bcrypt.compare(password, u.passwordHash || '');
    if (!ok)
      return res.status(401).json({ message: 'Username atau password salah' });

    const token = signToken(u);
    res.json({
      token,
      user: {
        id: u._id,
        username: u.username,
        phone: u.phone,
        balance: u.balance,
        referralCode: u.referralCode,
        role: u.role,
        bank: u.bank,
        contacts: u.contacts
      }
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

export default router;
