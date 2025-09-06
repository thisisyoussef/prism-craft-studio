import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
// CommonJS import form for compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createClient = require('socket.io-client');
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/db';

describe('Realtime events', () => {
	let mongo: MongoMemoryServer;
	let httpServer: any;
	let ioServer: IOServer;
	let url: string;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		await connectToDatabase(mongo.getUri());

		httpServer = createServer(app);
		ioServer = new IOServer(httpServer, { cors: { origin: '*' } });
		// Minimal subscribe handler to join rooms
		ioServer.on('connection', (socket) => {
			socket.on('subscribe', ({ room }) => socket.join(room));
		});
		await new Promise<void>((resolve) => httpServer.listen(0, resolve));
		const address = httpServer.address();
		url = `http://localhost:${address.port}`;
	});

	afterAll(async () => {
		ioServer.close();
		httpServer.close();
		await disconnectFromDatabase();
		await mongo.stop();
	});

	afterEach(async () => {
		await mongoose.connection.db?.dropDatabase();
	});

	it('emits order.updated to room on order status change', async () => {
		const order = await request(app).post('/api/orders').send({ productName: 'Cap', productCategory: 'Hats', quantity: 5, unitPrice: 10, totalAmount: 50 });
		const orderId = order.body.id;

		const client = createClient(url);
		await new Promise<void>((resolve) => client.on('connect', () => resolve()));
		client.emit('subscribe', { room: `order:${orderId}` });

		const received = new Promise<any>((resolve) => {
			client.on('order.updated', (payload: any) => resolve(payload));
		});

		await request(app).patch(`/api/orders/${orderId}`).send({ status: 'in_production' });
		const payload = await received;
		expect(payload.id).toBe(orderId);
		expect(payload.status).toBe('in_production');
		client.close();
	});
});

