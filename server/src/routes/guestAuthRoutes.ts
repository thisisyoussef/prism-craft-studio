import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { GuestMagicLink } from '../models/GuestMagicLink';
import { sendEmail } from '../services/emailService';

export const guestAuthRouter = Router();

function baseUrl() {
  return process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
}

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Request a magic link for guest order access
// Body: { email: string, orderId?: string }
guestAuthRouter.post('/request-link', async (req, res, next) => {
  try {
    const email = String((req.body?.email || '')).toLowerCase().trim();
    const orderId = req.body?.orderId ? String(req.body.orderId) : undefined;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await GuestMagicLink.create({
      email,
      tokenHash,
      orderIds: orderId ? [orderId] : undefined,
      intent: 'order_access',
      expiresAt,
      createdByIp: (req.headers['x-forwarded-for'] as string) || req.ip,
    });

    const link = `${baseUrl()}/guest/verify?token=${encodeURIComponent(token)}`;
    let sent = false;
    try {
      await sendEmail({
        to: email,
        subject: 'Access your order at Prism Craft Studio',
        html: `<p>Use the button below to access your order.</p><p><a href="${link}">Access my order</a></p><p>This link expires in 15 minutes.</p>`,
        text: `Access your order: ${link}`,
      });
      sent = true;
    } catch (e) {
      console.warn('[email] Send failed, returning devLink if available. Error:', e);
    }

    const allowDevLink = process.env.NODE_ENV !== 'production' || process.env.RETURN_DEV_LINKS === 'true'
    res.json({ ok: true, sent, devLink: allowDevLink ? link : undefined });
  } catch (err) { next(err); }
});

// Verify a magic link token and issue a guest access token
// Body: { token: string }
guestAuthRouter.post('/verify', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const tokenHash = sha256Hex(token);
    const rec = await GuestMagicLink.findOne({ tokenHash }).lean();
    if (!rec) return res.status(400).json({ error: 'Invalid token' });
    if (rec.usedAt) return res.status(400).json({ error: 'Token already used' });
    if (new Date(rec.expiresAt).getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' });

    // Mark used (fire-and-forget)
    await GuestMagicLink.updateOne({ _id: rec._id }, { $set: { usedAt: new Date() } }).exec();

    const secret = process.env.JWT_GUEST_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const guestJwt = jwt.sign(
      { guest: true, typ: 'guest', email: rec.email, orderIds: rec.orderIds },
      secret,
      { expiresIn: '30d' }
    );

    res.json({ token: guestJwt, email: rec.email });
  } catch (err) { next(err); }
});
