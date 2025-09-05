import { Application } from 'express';
import { productRouter } from './productRoutes';
import { emailRouter } from './emailRoutes';
import { orderRouter } from './orderRoutes';

export function registerRoutes(app: Application) {
	app.use('/api/products', productRouter);
	app.use('/api/emails', emailRouter);
	app.use('/api/orders', orderRouter);
}