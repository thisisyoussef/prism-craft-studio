import { Router } from 'express';
import { PricingRule } from '../models/PricingRule';

export const pricingRouter = Router();
pricingRouter.get('/', async (req, res, next) => {
	try {
		const rules = await PricingRule.find({ active: true }).sort({ productType: 1, quantityMin: 1 }).lean();
		res.json(rules.map(serializePricing));
	} catch (err) { next(err); }
});

// For test convenience only, allow POST without auth in test env
pricingRouter.post('/', async (req, res, next) => {
	try {
		if (process.env.NODE_ENV !== 'test') return res.status(403).json({ error: 'Forbidden' });
		const created = await PricingRule.create(req.body);
		res.status(201).json(serializePricing(created.toObject()));
	} catch (err) { next(err); }
});

function serializePricing(p: any) {
	return {
		id: p._id?.toString?.(),
		productType: p.productType,
		customizationType: p.customizationType,
		quantityMin: p.quantityMin,
		quantityMax: p.quantityMax,
		basePrice: p.basePrice,
		customizationCost: p.customizationCost,
		discountPercentage: p.discountPercentage,
		active: p.active,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
	};
}

