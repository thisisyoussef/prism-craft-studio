import request from 'supertest';
import express from 'express';
import { emailRouter } from '../src/routes/emailRoutes';

jest.mock('../src/services/emailService', () => ({
	sendEmail: jest.fn().mockResolvedValue({ id: 'test-email-id' })
}));

const app = express();
app.use(express.json());
app.use('/api/emails', emailRouter);

describe('Email routes', () => {
	it('requires auth', async () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		const res = await request(app).post('/api/emails/send').send({ to: 'a@b.com', subject: 'Hello' });
		expect(res.status).toBe(401);
		process.env.NODE_ENV = original;
	});

	it('sends email when authenticated in test env', async () => {
		const res = await request(app).post('/api/emails/send').send({ to: 'a@b.com', subject: 'Hello' });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, id: 'test-email-id' });
	});
});