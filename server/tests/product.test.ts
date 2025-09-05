import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';
import { Product } from '../src/models/Product';

describe('Products API', () => {
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
		await Product.deleteMany({});
	});

	it('GET /api/products returns empty list initially', async () => {
		const res = await request(app).get('/api/products');
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it('POST /api/products requires auth', async () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		const res = await request(app)
			.post('/api/products')
			.send({ name: 'Shirt', category: 'T-Shirts', basePrice: 9.99 });
		expect(res.status).toBe(401);
		process.env.NODE_ENV = originalEnv;
	});

	it('POST /api/products creates a product with test auth bypass', async () => {
		const res = await request(app)
			.post('/api/products')
			.send({ name: 'Shirt', category: 'T-Shirts', basePrice: 9.99 });
		expect(res.status).toBe(201);
		expect(res.body.name).toBe('Shirt');
		const list = await request(app).get('/api/products');
		expect(list.body.length).toBe(1);
	});
});