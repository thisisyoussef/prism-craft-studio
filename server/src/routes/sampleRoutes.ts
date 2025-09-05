import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Sample } from '../models/Sample';

export const sampleRouter = Router();

function generateSampleNumber() { return `SMPL-${Date.now()}`; }

sampleRouter.post('/', requireAuth, async (req, res, next) => {
	try {
		const body = req.body || {};
		const sample = await Sample.create({
			sampleNumber: generateSampleNumber(),
			products: body.products || [],
			totalPrice: body.totalPrice || 0,
			status: body.status || 'ordered',
			shippingAddress: body.shippingAddress,
			trackingNumber: body.trackingNumber,
		});
		res.status(201).json(serializeSample(sample));
	} catch (err) { next(err); }
});

sampleRouter.get('/', requireAuth, async (req, res, next) => {
	try {
		const samples = await Sample.find({}).sort({ createdAt: -1 }).lean();
		res.json(samples.map(serializeSample));
	} catch (err) { next(err); }
});

sampleRouter.get('/:id', requireAuth, async (req, res, next) => {
	try {
		const sample = await Sample.findById(req.params.id).lean();
		if (!sample) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeSample(sample));
	} catch (err) { next(err); }
});

sampleRouter.patch('/:id', requireAuth, async (req, res, next) => {
	try {
		const sample = await Sample.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
		if (!sample) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeSample(sample));
	} catch (err) { next(err); }
});

function serializeSample(s: any) {
	return {
		id: s._id.toString(),
		sampleNumber: s.sampleNumber,
		products: s.products || [],
		totalPrice: s.totalPrice,
		status: s.status,
		shippingAddress: s.shippingAddress,
		trackingNumber: s.trackingNumber,
		createdAt: s.createdAt,
		updatedAt: s.updatedAt,
	};
}

