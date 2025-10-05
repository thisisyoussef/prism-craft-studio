import { Application } from 'express';
import { productRouter } from './productRoutes';
import { emailRouter } from './emailRoutes';
import { orderRouter } from './orderRoutes';
import { bookingRouter } from './bookingRoutes';
import { profileRouter } from './profileRoutes';
import { companyRouter } from './companyRoutes';
import { pricingRouter } from './pricingRoutes';
import { fileRouter } from './fileRoutes';
import { stripeRoutes } from './stripeRoutes';
import authRouter from './authRoutes';
import { variantRouter } from './variantRoutes';
import { guestDraftRouter } from './guestDraftRoutes';
import { guestAuthRouter } from './guestAuthRoutes';
import { guestOrderRouter } from './guestOrderRoutes';
import { leadTimeRouter } from './leadTimeRoutes';

export function registerRoutes(app: Application) {
	app.use('/api/auth', authRouter);
	app.use('/api/products', productRouter);
	app.use('/api/emails', emailRouter);
	app.use('/api/orders', orderRouter);
	app.use('/api/bookings', bookingRouter);
	app.use('/api/profile', profileRouter);
	app.use('/api/company', companyRouter);
	app.use('/api/pricing', pricingRouter);
	app.use('/api/files', fileRouter);
	app.use('/api', stripeRoutes);
	app.use('/api', variantRouter);
	app.use('/api/guest-drafts', guestDraftRouter);
	app.use('/api/guest/auth', guestAuthRouter);
	app.use('/api/guest/orders', guestOrderRouter);
  app.use('/api/lead-times', leadTimeRouter);
}