import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

jest.mock('stripe', () => {
	return jest.fn().mockImplementation(() => ({
		checkout: {
			sessions: {
				create: jest.fn().mockResolvedValue({ id: 'cs_test_123', url: 'https://stripe.test/session' })
			}
		},
		invoices: {
			create: jest.fn().mockResolvedValue({ id: 'in_test_123', hosted_invoice_url: 'https://stripe.test/invoice' })
		}
	}));
});

describe('Stripe endpoints', () => {
	let mongo: MongoMemoryServer;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		await connectToDatabase(mongo.getUri());
	});

	afterAll(async () => {
		await disconnectFromDatabase();
		await mongo.stop();
	});

	afterEach(async () => {
		await mongoose.connection.db?.dropDatabase();
	});

	it('POST /api/payments/create-checkout returns session url', async () => {
		const order = await request(app).post('/api/orders').send({ productName: 'Hoodie', productCategory: 'Hoodies', quantity: 10, unitPrice: 25, totalAmount: 250 });
		const res = await request(app).post('/api/payments/create-checkout').send({ orderId: order.body.id, phase: 'deposit' });
		expect(res.status).toBe(200);
		expect(res.body.url).toContain('stripe.test');
	});

	it('POST /api/payments/create-invoice returns invoice url', async () => {
		const order = await request(app).post('/api/orders').send({ productName: 'Hoodie', productCategory: 'Hoodies', quantity: 10, unitPrice: 25, totalAmount: 250 });
		const res = await request(app).post('/api/payments/create-invoice').send({ orderId: order.body.id });
		expect(res.status).toBe(200);
		expect(res.body.invoiceUrl).toContain('stripe.test');
	});

	it('POST /api/webhooks/stripe returns 200', async () => {
		const res = await request(app)
			.post('/api/webhooks/stripe')
			.set('stripe-signature', 't=test')
			.send({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } });
		expect(res.status).toBe(200);
	});
});

