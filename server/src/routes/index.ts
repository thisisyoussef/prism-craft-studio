import { Application } from 'express';
import { productRouter } from './productRoutes';
import { emailRouter } from './emailRoutes';

export function registerRoutes(app: Application) {
	app.use('/api/products', productRouter);
	app.use('/api/emails', emailRouter);
}