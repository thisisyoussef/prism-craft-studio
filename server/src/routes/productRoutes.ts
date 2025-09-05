import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Product } from '../models/Product';

export const productRouter = Router();

productRouter.get('/', async (req, res, next) => {
	try {
		const products = await Product.find({ active: true }).sort({ createdAt: -1 }).lean();
		res.json(products);
	} catch (err) { next(err); }
});

productRouter.post('/', requireAuth, async (req, res, next) => {
	try {
		const { name, category, basePrice } = req.body;
		if (!name || !category || typeof basePrice !== 'number') {
			return res.status(400).json({ error: 'name, category, basePrice required' });
		}
		const product = await Product.create(req.body);
		res.status(201).json(product);
	} catch (err) { next(err); }
});