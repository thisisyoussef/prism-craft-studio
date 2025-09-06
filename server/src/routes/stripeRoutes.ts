import { Router } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2023-10-16' as any });

export const stripeRoutes = Router();

stripeRoutes.post('/payments/create-checkout', async (req, res, next) => {
	try {
		const { orderId, phase } = req.body || {};
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			success_url: 'https://example.com/success',
			cancel_url: 'https://example.com/cancel',
			line_items: [{ price_data: { currency: 'usd', product_data: { name: `Order ${orderId} ${phase}` }, unit_amount: 100 }, quantity: 1 }],
		});
		res.json({ id: session.id, url: (session as any).url });
	} catch (err) { next(err); }
});

stripeRoutes.post('/payments/create-invoice', async (req, res, next) => {
	try {
		const { orderId } = req.body || {};
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

