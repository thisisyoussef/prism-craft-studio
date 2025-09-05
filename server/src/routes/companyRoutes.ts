import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Profile } from '../models/Profile';
import { Company } from '../models/Company';

export const companyRouter = Router();

companyRouter.get('/', requireAuth, async (req, res, next) => {
	try {
		const prof = await Profile.findOne({ userId: req.user!.id }).lean();
		if (!prof?.companyId) return res.status(404).json({ error: 'Not Found' });
		const company = await Company.findById(prof.companyId).lean();
		if (!company) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeCompany(company));
	} catch (err) { next(err); }
});

companyRouter.patch('/', requireAuth, async (req, res, next) => {
	try {
		const prof = await Profile.findOne({ userId: req.user!.id }).lean();
		if (!prof?.companyId) return res.status(404).json({ error: 'Not Found' });
		const company = await Company.findByIdAndUpdate(prof.companyId, req.body, { new: true }).lean();
		if (!company) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeCompany(company));
	} catch (err) { next(err); }
});

function serializeCompany(c: any) {
	return {
		id: c._id.toString(),
		name: c.name,
		industry: c.industry,
		size: c.size,
		address: c.address,
		phone: c.phone,
		logoUrl: c.logoUrl,
		billingAddress: c.billingAddress,
		createdAt: c.createdAt,
		updatedAt: c.updatedAt,
	};
}

