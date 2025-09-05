import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Order Timeline API', () => {
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

	it('POST then GET timeline events for an order', async () => {
		const orderId = await createOrderId();
		const post = await request(app)
			.post(`/api/orders/${orderId}/timeline`)
			.send({ eventType: 'note', description: 'Created by admin', eventData: { source: 'test' } });
		expect(post.status).toBe(201);
		expect(post.body.eventType).toBe('note');
		expect(post.body.description).toBe('Created by admin');

		const list = await request(app).get(`/api/orders/${orderId}/timeline`);
		expect(list.status).toBe(200);
		expect(list.body.length).toBe(1);
		expect(list.body[0].id).toBe(post.body.id);
	});
});

