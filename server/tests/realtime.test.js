"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
// CommonJS import form for compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createClient = require('socket.io-client');
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("../src/app");
const db_1 = require("../src/config/db");
describe('Realtime events', () => {
    let mongo;
    let httpServer;
    let ioServer;
    let url;
    beforeAll(async () => {
        mongo = await mongodb_memory_server_1.MongoMemoryServer.create();
        await (0, db_1.connectToDatabase)(mongo.getUri());
        httpServer = (0, http_1.createServer)(app_1.app);
        ioServer = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
        // Minimal subscribe handler to join rooms
        ioServer.on('connection', (socket) => {
            socket.on('subscribe', ({ room }) => socket.join(room));
        });
        await new Promise((resolve) => httpServer.listen(0, resolve));
        const address = httpServer.address();
        url = `http://localhost:${address.port}`;
    });
    afterAll(async () => {
        ioServer.close();
        httpServer.close();
        await (0, db_1.disconnectFromDatabase)();
        await mongo.stop();
    });
    afterEach(async () => {
        await mongoose_1.default.connection.db?.dropDatabase();
    });
    it('emits order.updated to room on order status change', async () => {
        const order = await (0, supertest_1.default)(app_1.app).post('/api/orders').send({ productName: 'Cap', productCategory: 'Hats', quantity: 5, unitPrice: 10, totalAmount: 50 });
        const orderId = order.body.id;
        const client = createClient(url);
        await new Promise((resolve) => client.on('connect', () => resolve()));
        client.emit('subscribe', { room: `order:${orderId}` });
        const received = new Promise((resolve) => {
            client.on('order.updated', (payload) => resolve(payload));
        });
        await (0, supertest_1.default)(app_1.app).patch(`/api/orders/${orderId}`).send({ status: 'in_production' });
        const payload = await received;
        expect(payload.id).toBe(orderId);
        expect(payload.status).toBe('in_production');
        client.close();
    });
});
