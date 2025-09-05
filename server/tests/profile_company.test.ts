import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Profiles & Company API', () => {
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

	it('PATCH /api/profile creates profile with company, then GET endpoints return data, and PATCH /api/company updates', async () => {
		// Create profile with company
		const upsert = await request(app)
			.patch('/api/profile')
			.send({ firstName: 'Ada', lastName: 'Lovelace', companyName: 'Analytical Engines Inc.' });
		expect(upsert.status).toBe(200);
		expect(upsert.body.firstName).toBe('Ada');
		expect(upsert.body.companyId).toBeTruthy();

		// GET profile
		const getProfile = await request(app).get('/api/profile');
		expect(getProfile.status).toBe(200);
		expect(getProfile.body.firstName).toBe('Ada');

		// GET company
		const getCompany = await request(app).get('/api/company');
		expect(getCompany.status).toBe(200);
		expect(getCompany.body.name).toBe('Analytical Engines Inc.');

		// PATCH company name
		const patchCompany = await request(app)
			.patch('/api/company')
			.send({ name: 'Analytical Engines, Ltd.' });
		expect(patchCompany.status).toBe(200);
		expect(patchCompany.body.name).toBe('Analytical Engines, Ltd.');
	});
});

