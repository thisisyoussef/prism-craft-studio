import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Pricing Rules API', () => {
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

	it('GET /api/pricing returns empty list initially then returns inserted rules', async () => {
		const empty = await request(app).get('/api/pricing');
		expect(empty.status).toBe(200);
		expect(empty.body).toEqual([]);

		// Insert directly via POST (admin) not required; for test, insert through the model route to keep it simple
		// We'll add a limited POST for test environment only
		const created = await request(app).post('/api/pricing').send({ productType: 't-shirt', customizationType: 'screen-print', quantityMin: 50, basePrice: 12.99, customizationCost: 3.99, discountPercentage: 0, active: true });
		expect(created.status).toBe(201);

		const list = await request(app).get('/api/pricing');
		expect(list.status).toBe(200);
		expect(list.body.length).toBe(1);
		expect(list.body[0].productType).toBe('t-shirt');
	});
});

