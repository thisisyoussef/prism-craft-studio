import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { DesignerBooking } from '../models/DesignerBooking';

export const bookingRouter = Router();

bookingRouter.post('/', requireAuth, async (req, res, next) => {
	try {
		const body = req.body || {};
		const booking = await DesignerBooking.create({
			designerId: body.designerId,
			consultationType: body.consultationType,
			scheduledDate: body.scheduledDate,
			durationMinutes: body.durationMinutes,
			status: body.status || 'scheduled',
			price: body.price,
			meetingLink: body.meetingLink,
			notes: body.notes,
			projectFiles: body.projectFiles,
		});
		res.status(201).json(serializeBooking(booking));
	} catch (err) { next(err); }
});

bookingRouter.get('/', requireAuth, async (req, res, next) => {
	try {
		const bookings = await DesignerBooking.find({}).sort({ createdAt: -1 }).lean();
		res.json(bookings.map(serializeBooking));
	} catch (err) { next(err); }
});

bookingRouter.patch('/:id', requireAuth, async (req, res, next) => {
	try {
		const booking = await DesignerBooking.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
		if (!booking) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeBooking(booking));
	} catch (err) { next(err); }
});

function serializeBooking(b: any) {
	return {
		id: b._id.toString(),
		designerId: b.designerId,
		consultationType: b.consultationType,
		scheduledDate: b.scheduledDate,
		durationMinutes: b.durationMinutes,
		status: b.status,
		price: b.price,
		meetingLink: b.meetingLink,
		notes: b.notes,
		projectFiles: b.projectFiles || [],
		createdAt: b.createdAt,
		updatedAt: b.updatedAt,
	};
}

