import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { sendEmail } from '../services/emailService';

export const emailRouter = Router();

// Require auth in production; allow in dev for guest flows and testing
const maybeAuth = (req: Request, res: Response, next: NextFunction) => {
    if ((process.env.NODE_ENV || 'development') === 'production') return requireAuth(req, res, next);
    return next();
};

emailRouter.post('/send', maybeAuth, async (req, res, next) => {
	try {
		const { to, subject, text, html } = req.body;
		if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
		const result = await sendEmail({ to, subject, text, html });
		res.status(200).json({ ok: true, id: (result as any)?.id ?? null });
	} catch (err) { next(err); }
});