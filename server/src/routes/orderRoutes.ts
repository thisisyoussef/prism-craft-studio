import { Router, Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { OrderTimeline } from '../models/OrderTimeline';
import { ProductionUpdate } from '../models/ProductionUpdate';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { GuestMagicLink } from '../models/GuestMagicLink';
import { sendEmail } from '../services/emailService';
import crypto from 'crypto';
import { emitToRoom } from '../services/realtimeService';

export const orderRouter = Router();

function generateOrderNumber() {
	return `ORD-${Date.now()}`;
}

// Create new order (customers only)
orderRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const body = req.body || {};
		const totalAmount = typeof body.totalAmount === 'number' ? body.totalAmount : 0;

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
			status: 'submitted',
			totalPaidAmount: 0,
			customerId: req.user!.id,
			customerEmail: req.user!.email,
			customerName: `${req.user!.firstName} ${req.user!.lastName}`,
			companyName: body.companyName,
			shippingAddress: body.shippingAddress
		});

		// Create single payment record (product amount only)
		await Payment.create({
			orderId: order._id, 
			amountCents: Math.round(totalAmount * 100), 
			currency: 'usd', 
			status: 'pending'
		});

		res.status(201).json(serializeOrder(order));
	} catch (err) { next(err); }
});

// Admin: Resend guest access magic link
orderRouter.post('/:id/guest/resend-link', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).lean();
        if (!order) return res.status(404).json({ error: 'Order not found' });
        const email = (order as any).guestEmail || (order as any).customerEmail;
        if (!email) return res.status(400).json({ error: 'No guest/customer email on order' });

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await GuestMagicLink.create({ email: String(email).toLowerCase(), tokenHash, orderIds: [req.params.id], intent: 'order_access', expiresAt, createdByIp: (req.headers['x-forwarded-for'] as string) || req.ip });
        const frontendBase = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
        const link = `${frontendBase}/guest/verify?token=${encodeURIComponent(token)}`;
        try {
            await sendEmail({
                to: email,
                subject: 'Access your order at Prism Craft Studio',
                html: `<p>Use the button below to access your order.</p><p><a href="${link}">Access my order</a></p><p>This link expires in 15 minutes.</p>`,
            });
            res.json({ message: 'Email sent successfully' });
        } catch (err) {
            console.error('Error sending email:', err);
            res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (err) { next(err); }
});

// Get orders (customers see only their orders, admins see all)
orderRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const query = req.user!.role === 'admin' ? {} : { customerId: req.user!.id };
		const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
		res.json(orders.map(serializeOrder));
	} catch (err) { next(err); }
});

// Get order by ID (customers can only see their orders)
orderRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const query = req.user!.role === 'admin' 
			? { _id: req.params.id }
			: { _id: req.params.id, customerId: req.user!.id };
		const order = await Order.findOne(query).lean();
		if (!order) return res.status(404).json({ error: 'Not Found' });
		res.json(serializeOrder(order));
	} catch (err) { next(err); }
});

// Admin: Update order status
orderRouter.patch('/:id/status', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { status, trackingNumber, estimatedDelivery } = req.body;
		
		const validStatuses = ['submitted', 'paid', 'in_production', 'shipping', 'delivered'];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ error: 'Invalid status' });
		}

		const updateData: any = { status };
		if (trackingNumber) updateData.trackingNumber = trackingNumber;
		if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
		if (status === 'delivered') updateData.actualDelivery = new Date();

		const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();
		if (!order) return res.status(404).json({ error: 'Order not found' });

		// No additional payment processing needed

		const serialized = serializeOrder(order);
		emitToRoom(`order:${serialized.id}`, 'order.updated', serialized);
		
		console.log(`📋 Order ${order.orderNumber} status updated to: ${status} by admin`);
		res.json(serialized);
	} catch (err) { next(err); }
});

// Customer: Mark payment as completed (simulate payment processing)
orderRouter.patch('/:id/payment', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const order = await Order.findById(req.params.id);
		if (!order) return res.status(404).json({ error: 'Order not found' });

		// Check if user owns this order (unless admin)
		if (req.user!.role !== 'admin' && order.customerId !== req.user!.id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		// Mark payment as paid
		const payment = await Payment.findOne({ 
			orderId: req.params.id, 
			status: 'pending'
		});
		
		if (payment) {
			payment.status = 'paid';
			payment.paidAt = new Date();
			await payment.save();
			
			// Update order status and payment info
			order.status = 'paid';
			order.totalPaidAmount = payment.amountCents / 100;
			order.paidAt = new Date();
			await order.save();
			
			console.log(`💳 Payment completed for order ${order.orderNumber}`);
		}

		res.json(serializeOrder(order));
	} catch (err) { next(err); }
});

// Get order payments (admin only)
orderRouter.get('/:id/payment', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const payments = await Payment.find({ orderId: req.params.id }).sort({ createdAt: 1 }).lean();
		res.json(payments.map(p => ({
			id: p._id.toString(),
			orderId: p.orderId.toString(),
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

// Add timeline event (admin only)
orderRouter.post('/:id/timeline', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
		const payload = {
			id: e._id.toString(),
			orderId: e.orderId.toString(),
			eventType: e.eventType,
			description: e.description,
			eventData: e.eventData,
			triggerSource: e.triggerSource,
			createdAt: e.createdAt,
		};
		// Realtime: notify subscribers of new timeline event
		emitToRoom(`order:${req.params.id}`, 'order.timeline.created', payload);
		res.status(201).json(payload);
	} catch (err) { next(err); }
});

// Get timeline events
orderRouter.get('/:id/timeline', async (req, res, next) => {
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

// Add production update (admin only)
orderRouter.post('/:id/production', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
		const serialized = serializeProductionUpdate(update);
		// Realtime: notify subscribers of new production update
		emitToRoom(`order:${req.params.id}`, 'order.production.created', serialized);
		res.json(serialized);
	} catch (err) { next(err); }
});

orderRouter.get('/:id/production-updates', async (req, res, next) => {
    try {
        const updates = await ProductionUpdate.find({ orderId: req.params.id }).sort({ createdAt: -1 }).lean();
        res.json(updates.map(serializeProductionUpdate));
    } catch (err) { next(err); }
});

orderRouter.get('/:id/mockups', async (_req, res) => {
    // Mockup model not implemented yet
    res.json([]);
});

// Attach or update mockup image URLs on an order
orderRouter.patch('/:id/mockups', requireAuth, async (req, res, next) => {
    try {
        const { mockupImages } = req.body || {};
        if (!mockupImages || typeof mockupImages !== 'object') {
            return res.status(400).json({ error: 'mockupImages object required' });
        }
        const update: any = {};
        for (const k of ['front','back','sleeve','composite']) {
            const val = mockupImages?.[k];
            if (typeof val === 'string' && val) {
                update[`mockupImages.${k}`] = val;
            }
        }
        const updated = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        res.json(serializeOrder(updated));
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

function serializeOrder(order: any) {
    return {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        productCategory: order.productCategory,
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalAmount: order.totalAmount,
        customization: order.customization,
        colors: order.colors,
        sizes: order.sizes,
        printLocations: order.printLocations,
        status: order.status,
        priority: order.priority,
        labels: order.labels,
        totalPaidAmount: order.totalPaidAmount,
        paidAt: order.paidAt,
        customerId: order.customerId,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        companyName: order.companyName,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        artworkFiles: order.artworkFiles,
        productionNotes: order.productionNotes,
        customerNotes: order.customerNotes,
        adminNotes: order.adminNotes,
        guestEmail: order.guestEmail,
        mockupImages: order.mockupImages,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}
