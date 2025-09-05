import { Application } from 'express';
import { productRouter } from './productRoutes';
import { emailRouter } from './emailRoutes';
import { orderRouter } from './orderRoutes';
import { sampleRouter } from './sampleRoutes';
import { bookingRouter } from './bookingRoutes';
import { profileRouter } from './profileRoutes';
import { companyRouter } from './companyRoutes';

export function registerRoutes(app: Application) {
	app.use('/api/products', productRouter);
	app.use('/api/emails', emailRouter);
	app.use('/api/orders', orderRouter);
	app.use('/api/samples', sampleRouter);
	app.use('/api/bookings', bookingRouter);
	app.use('/api/profile', profileRouter);
	app.use('/api/company', companyRouter);
}