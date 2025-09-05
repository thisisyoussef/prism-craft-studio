import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';
import path from 'path';
import fs from 'fs';

describe('File Uploads API', () => {
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

	it('POST /api/files/upload uploads a file and returns url; GET by order returns list', async () => {
		const tmpFile = path.join(__dirname, 'tmp.txt');
		fs.writeFileSync(tmpFile, 'hello');

		// need an order id to associate
		const order = await request(app).post('/api/orders').send({ productName: 'Polo', productCategory: 'Polos', quantity: 10, unitPrice: 18, totalAmount: 180 });
		const orderId = order.body.id;

		const res = await request(app)
			.post('/api/files/upload')
			.field('orderId', orderId)
			.field('filePurpose', 'artwork')
			.attach('file', tmpFile);

		expect(res.status).toBe(200);
		expect(res.body.fileUrl).toContain('/uploads/');

		fs.unlinkSync(tmpFile);

		const list = await request(app).get(`/api/files/order/${orderId}`);
		expect(list.status).toBe(200);
		expect(list.body.length).toBe(1);
	});
});

