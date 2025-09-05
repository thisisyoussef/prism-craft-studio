import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { OrderTimeline } from '../models/OrderTimeline';
import { ProductionUpdate } from '../models/ProductionUpdate';

export const orderRouter = Router();

function generateOrderNumber() {
	return `ORD-${Date.now()}`;
}

orderRouter.post('/', requireAuth, async (req, res, next) => {
	try {
		const body = req.body || {};
		const totalAmount = typeof body.totalAmount === 'number' ? body.totalAmount : 0;
		const depositAmount = Math.round(totalAmount * 0.4 * 100) / 100;
		const balanceAmount = Math.round((totalAmount - depositAmount) * 100) / 100;

		const order = await Order.create({
			orderNumber: generateOrderNumber(),
			productCategory: body.productCategory,
			productName: body.productName,
			quantity: body.quantity,
			unitPrice: body.unitPrice,
			totalAmount,
			customization: body.customization,
			colors: body.colors,
			sizes: body.sizes,
			printLocations: body.printLocations,
			status: 'deposit_pending',
			depositAmount,
			balanceAmount,
		});

		await Payment.insertMany([
			{ orderId: order._id, phase: 'deposit', amountCents: Math.round(depositAmount * 100), currency: 'usd', status: 'pending' },
			{ orderId: order._id, phase: 'balance', amountCents: Math.round(balanceAmount * 100), currency: 'usd', status: 'pending' },
		]);

		res.status(201).json(serializeOrder(order));
	} catch (err) { next(err); }
});

orderRouter.get('/', requireAuth, async (req, res, next) => {
	try {
		const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
		res.json(orders.map(serializeOrder));
	} catch (err) { next(err); }
});

orderRouter.get('/:id', requireAuth, async (req, res, next) => {
	try {
		const order = await Order.findById(req.params.id).lean();
		if (!order) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeOrder(order));
	} catch (err) { next(err); }
});

orderRouter.patch('/:id', requireAuth, async (req, res, next) => {
	try {
		const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
		if (!order) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeOrder(order));
	} catch (err) { next(err); }
});

orderRouter.get('/:id/payments', requireAuth, async (req, res, next) => {
	try {
		const payments = await Payment.find({ orderId: req.params.id }).sort({ createdAt: 1 }).lean();
		res.json(payments.map(p => ({
			id: p._id.toString(),
			orderId: p.orderId.toString(),
			phase: p.phase,
			amountCents: p.amountCents,
			currency: p.currency,
			status: p.status,
			stripePaymentIntentId: p.stripePaymentIntentId,
			stripeCheckoutSessionId: p.stripeCheckoutSessionId,
			stripeChargeId: p.stripeChargeId,
			paidAt: p.paidAt,
			metadata: p.metadata,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		}))); 
	} catch (err) { next(err); }
});

orderRouter.post('/:id/timeline', requireAuth, async (req, res, next) => {
	try {
		const { eventType, description, eventData, triggerSource } = req.body || {};
		const ev = await OrderTimeline.create({
			orderId: req.params.id,
			eventType,
			description,
			eventData,
			triggerSource: triggerSource || 'manual',
		});
		const e: any = ev as any;
		res.status(201).json({
			id: e._id.toString(),
			orderId: e.orderId.toString(),
			eventType: e.eventType,
			description: e.description,
			eventData: e.eventData,
			triggerSource: e.triggerSource,
			createdAt: e.createdAt,
		});
	} catch (err) { next(err); }
});

orderRouter.get('/:id/timeline', requireAuth, async (req, res, next) => {
	try {
		type TimelineLean = { _id: any; orderId: any; eventType: string; description: string; eventData?: any; triggerSource?: any; createdAt: Date };
		const eventsRaw = await OrderTimeline.find({ orderId: req.params.id }).sort({ createdAt: -1 }).lean();
		const events = (eventsRaw as unknown as TimelineLean[]).map((ev) => ({
			id: ev._id.toString(),
			orderId: ev.orderId.toString(),
			eventType: ev.eventType,
			description: ev.description,
			eventData: ev.eventData,
			triggerSource: ev.triggerSource,
			createdAt: ev.createdAt,
		}));
		res.json(events);
	} catch (err) { next(err); }
});

orderRouter.post('/:id/production-updates', requireAuth, async (req, res, next) => {
	try {
		const { stage, status, description, photos, documents } = req.body || {};
		const update = await ProductionUpdate.create({
			orderId: req.params.id,
			stage,
			status,
			description,
			photos,
			documents,
		});
		res.status(201).json(serializeProductionUpdate(update));
	} catch (err) { next(err); }
});

orderRouter.get('/:id/production-updates', requireAuth, async (req, res, next) => {
	try {
		const updates = await ProductionUpdate.find({ orderId: req.params.id }).sort({ createdAt: -1 }).lean();
		res.json(updates.map(serializeProductionUpdate));
	} catch (err) { next(err); }
});

function serializeProductionUpdate(pu: any) {
	return {
		id: pu._id.toString(),
		orderId: pu.orderId.toString(),
		stage: pu.stage,
		status: pu.status,
		description: pu.description,
		photos: pu.photos || [],
		documents: pu.documents || [],
		estimatedCompletion: pu.estimatedCompletion,
		actualCompletion: pu.actualCompletion,
		createdBy: pu.createdBy,
		visibleToCustomer: pu.visibleToCustomer ?? true,
		createdAt: pu.createdAt,
		updatedAt: pu.updatedAt,
	};
}

function serializeOrder(o: any) {
	return {
		id: o._id.toString(),
		orderNumber: o.orderNumber,
		productCategory: o.productCategory,
		productName: o.productName,
		quantity: o.quantity,
		unitPrice: o.unitPrice,
		totalAmount: o.totalAmount,
		customization: o.customization || {},
		colors: o.colors || [],
		sizes: o.sizes || {},
		printLocations: o.printLocations || [],
		status: o.status,
		priority: o.priority,
		labels: o.labels || [],
		depositAmount: o.depositAmount,
		balanceAmount: o.balanceAmount,
		depositPaidAt: o.depositPaidAt,
		balancePaidAt: o.balancePaidAt,
		shippingAddress: o.shippingAddress,
		trackingNumber: o.trackingNumber,
		estimatedDelivery: o.estimatedDelivery,
		actualDelivery: o.actualDelivery,
		artworkFiles: o.artworkFiles || [],
		productionNotes: o.productionNotes,
		customerNotes: o.customerNotes,
		adminNotes: o.adminNotes,
		stripeDepositPaymentIntent: o.stripeDepositPaymentIntent,
		stripeBalancePaymentIntent: o.stripeBalancePaymentIntent,
		createdAt: o.createdAt,
		updatedAt: o.updatedAt,
	};
}

