import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { sendEmail } from '../services/emailService';

export const emailRouter = Router();

emailRouter.post('/send', requireAuth, async (req, res, next) => {
	try {
		const { to, subject, text, html } = req.body;
		if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
		const result = await sendEmail({ to, subject, text, html });
		res.status(200).json({ ok: true, id: (result as any)?.id ?? null });
	} catch (err) { next(err); }
});