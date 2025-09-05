import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Production Updates API', () => {
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

	async function createOrderId() {
		const res = await request(app).post('/api/orders').send({
			productName: 'Premium Hoodie',
			productCategory: 'Hoodies',
			quantity: 50,
			unitPrice: 25,
			totalAmount: 1250,
		});
		return res.body.id as string;
	}

	it('POST then GET production updates for an order', async () => {
		const orderId = await createOrderId();
		const post = await request(app)
			.post(`/api/orders/${orderId}/production-updates`)
			.send({ stage: 'cutting', status: 'started', description: 'Cutting begun' });
		expect(post.status).toBe(201);
		expect(post.body.stage).toBe('cutting');

		const list = await request(app).get(`/api/orders/${orderId}/production-updates`);
		expect(list.status).toBe(200);
		expect(list.body.length).toBe(1);
		expect(list.body[0].id).toBe(post.body.id);
	});
});

