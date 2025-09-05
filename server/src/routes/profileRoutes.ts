import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Profile } from '../models/Profile';
import { Company } from '../models/Company';

export const profileRouter = Router();

profileRouter.get('/', requireAuth, async (req, res, next) => {
	try {
		const prof = await Profile.findOne({ userId: req.user!.id }).lean();
		if (!prof) return res.json({});
		res.json(serializeProfile(prof));
	} catch (err) { next(err); }
});

profileRouter.patch('/', requireAuth, async (req, res, next) => {
	try {
		const { firstName, lastName, phone, companyName } = req.body || {};
		let prof = await Profile.findOne({ userId: req.user!.id });
		if (!prof) {
			prof = await Profile.create({ userId: req.user!.id, firstName, lastName, phone });
		}
		if (typeof firstName !== 'undefined') prof.firstName = firstName;
		if (typeof lastName !== 'undefined') prof.lastName = lastName;
		if (typeof phone !== 'undefined') prof.phone = phone;
		if (companyName) {
			let company = await Company.findOne({ name: companyName });
			if (!company) company = await Company.create({ name: companyName });
			const cid: any = (company as any)._id;
			(prof as any).companyId = cid;
		}
		await prof.save();
		res.json(serializeProfile(prof.toObject()));
	} catch (err) { next(err); }
});

function serializeProfile(p: any) {
	return {
		id: p._id?.toString?.(),
		userId: p.userId,
		companyId: p.companyId?.toString?.(),
		firstName: p.firstName,
		lastName: p.lastName,
		role: p.role,
		phone: p.phone,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
	};
}

