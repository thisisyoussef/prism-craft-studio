import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';
import mongoose from 'mongoose';

describe('Orders API', () => {
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

	const sampleOrder = () => ({
		productName: 'Premium Hoodie',
		productCategory: 'Hoodies',
		quantity: 100,
		unitPrice: 25,
		totalAmount: 2500,
		customization: { print: 'front' },
		colors: ['Black'],
		sizes: { M: 50, L: 50 },
		printLocations: ['front'],
	});

	it('POST /api/orders creates an order and initializes payments', async () => {
		const res = await request(app).post('/api/orders').send(sampleOrder());
		expect(res.status).toBe(201);
		expect(res.body.orderNumber).toMatch(/^ORD-/);
		expect(res.body.depositAmount).toBeCloseTo(1000);
		expect(res.body.balanceAmount).toBeCloseTo(1500);

		const payments = await request(app).get(`/api/orders/${res.body.id}/payments`);
		expect(payments.status).toBe(200);
		expect(payments.body.length).toBe(2);
		expect(payments.body.map((p: any) => p.phase).sort()).toEqual(['balance','deposit']);
	});

	it('GET /api/orders lists orders', async () => {
		await request(app).post('/api/orders').send(sampleOrder());
		await request(app).post('/api/orders').send(sampleOrder());
		const res = await request(app).get('/api/orders');
		expect(res.status).toBe(200);
		expect(res.body.length).toBe(2);
	});

	it('GET /api/orders/:id retrieves one order', async () => {
		const created = await request(app).post('/api/orders').send(sampleOrder());
		const res = await request(app).get(`/api/orders/${created.body.id}`);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(created.body.id);
	});

	it('PATCH /api/orders/:id updates order status', async () => {
		const created = await request(app).post('/api/orders').send(sampleOrder());
		const res = await request(app).patch(`/api/orders/${created.body.id}`).send({ status: 'in_production' });
		expect(res.status).toBe(200);
		expect(res.body.status).toBe('in_production');
	});
});