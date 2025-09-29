import { Router } from 'express';
import Stripe from 'stripe';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2023-10-16' as any });

export const stripeRoutes = Router();

stripeRoutes.post('/payments/create-checkout', async (req, res, next) => {
	try {
		const { orderId, phase } = req.body || {};
		if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

		// Load order and pending payment
		const order = await Order.findById(orderId).lean();
		if (!order) return res.status(404).json({ error: 'Order not found' });

		const pendingPayment = await Payment.findOne({ orderId, status: 'pending' }).lean();
		const amountCents = pendingPayment?.amountCents || Math.round(Number(order.totalAmount || 0) * 100);
		if (!amountCents || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });

		const frontend = process.env.FRONTEND_URL || 'http://localhost:8081';
		const ph = String(phase || 'full_payment');
		const success_url = `${frontend.replace(/\/$/, '')}/orders/${orderId}?payment=success&phase=${encodeURIComponent(ph)}`;
		const cancel_url = `${frontend.replace(/\/$/, '')}/orders/${orderId}?payment=cancelled&phase=${encodeURIComponent(ph)}`;

		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			success_url,
			cancel_url,
			line_items: [{
				price_data: {
					currency: 'usd',
					product_data: { name: `Order ${order.orderNumber || orderId}` },
					unit_amount: amountCents,
				},
				quantity: 1,
			}],
			metadata: { orderId: String(orderId), phase: ph },
		});

		// Persist session ID back to pending payment if it exists
		if (pendingPayment?._id) {
			await Payment.findByIdAndUpdate(pendingPayment._id, { stripeCheckoutSessionId: session.id });
		}

		res.json({ id: session.id, url: (session as any).url });
	} catch (err) { next(err); }
});


stripeRoutes.post('/payments/create-invoice', async (req, res, next) => {
	try {
		const { orderId } = req.body || {};
		if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

		// Load order and pending payment
		const order = await Order.findById(orderId).lean();
		if (!order) return res.status(404).json({ error: 'Order not found' });

		const pendingPayment = await Payment.findOne({ orderId, status: 'pending' }).lean();
		const amountCents = pendingPayment?.amountCents || Math.round(Number(order.totalAmount || 0) * 100);
		if (!amountCents || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });

		const invoice = await stripe.invoices.create({
			collection_method: 'send_invoice',
			days_until_due: 7,
			metadata: { orderId },
		});
		res.json({ id: invoice.id, invoiceUrl: (invoice as any).hosted_invoice_url || 'https://example.com/invoice' });
	} catch (err) { next(err); }
});


stripeRoutes.post('/webhooks/stripe', async (req, res) => {
	// In real implementation, verify signature and handle events
	return res.status(200).send('ok');
});

