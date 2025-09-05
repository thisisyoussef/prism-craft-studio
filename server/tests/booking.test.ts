import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Designer Bookings API', () => {
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
		designerId: 'designer-1',
		consultationType: 'branding',
		scheduledDate: new Date().toISOString(),
		durationMinutes: 60,
		status: 'scheduled',
		price: 150,
	};

	it('POST /api/bookings creates a booking and GET lists it', async () => {
		const created = await request(app).post('/api/bookings').send(payload);
		expect(created.status).toBe(201);
		const list = await request(app).get('/api/bookings');
		expect(list.status).toBe(200);
		expect(list.body.length).toBe(1);
	});

	it('PATCH /api/bookings/:id updates status', async () => {
		const created = await request(app).post('/api/bookings').send(payload);
		const patched = await request(app).patch(`/api/bookings/${created.body.id}`).send({ status: 'confirmed' });
		expect(patched.status).toBe(200);
		expect(patched.body.status).toBe('confirmed');
	});
});

