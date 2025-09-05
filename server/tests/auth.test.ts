import request from 'supertest';
import express from 'express';
import { requireAuth } from '../src/middleware/auth';

describe('requireAuth middleware', () => {
	const app = express();
	app.get('/secure', requireAuth, (req, res) => {
		res.json({ userId: req.user?.id });
	});

	it('returns 401 when Authorization header missing', async () => {
		// Temporarily set NODE_ENV to production to disable bypass
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		const res = await request(app).get('/secure');
		expect(res.status).toBe(401);
		process.env.NODE_ENV = original;
	});

	it('allows request in test env bypass and attaches user', async () => {
		const res = await request(app).get('/secure');
		expect(res.status).toBe(200);
		expect(res.body.userId).toBe('test-user');
	});
});