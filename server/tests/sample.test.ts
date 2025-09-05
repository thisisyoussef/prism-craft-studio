import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Samples API', () => {
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

	const payload = {
		products: [{ name: 'Classic T-Shirt', qty: 2, price: 12.99 }],
		totalPrice: 25.98,
		status: 'ordered',
	};

	it('POST /api/samples creates a sample and GET lists it', async () => {
		const created = await request(app).post('/api/samples').send(payload);
		expect(created.status).toBe(201);
		expect(created.body.sampleNumber).toMatch(/^SMPL-/);

		const list = await request(app).get('/api/samples');
		expect(list.status).toBe(200);
		expect(list.body.length).toBe(1);
	});

	it('GET /api/samples/:id returns the sample and PATCH updates status', async () => {
		const created = await request(app).post('/api/samples').send(payload);
		const getOne = await request(app).get(`/api/samples/${created.body.id}`);
		expect(getOne.status).toBe(200);
		const patched = await request(app).patch(`/api/samples/${created.body.id}`).send({ status: 'shipped', trackingNumber: 'TRACK123' });
		expect(patched.status).toBe(200);
		expect(patched.body.status).toBe('shipped');
		expect(patched.body.trackingNumber).toBe('TRACK123');
	});
});

