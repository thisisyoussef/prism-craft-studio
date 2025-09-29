"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const app_1 = require("../src/app");
const db_1 = require("../src/config/db");
const mongoose_1 = __importDefault(require("mongoose"));
describe('Orders API', () => {
    let mongo;
    beforeAll(async () => {
        mongo = await mongodb_memory_server_1.MongoMemoryServer.create();
        await (0, db_1.connectToDatabase)(mongo.getUri());
    });
    afterAll(async () => {
        await (0, db_1.disconnectFromDatabase)();
        await mongo.stop();
    });
    afterEach(async () => {
        await mongoose_1.default.connection.db?.dropDatabase();
    });
    const sampleOrder = () => ({
        productName: 'Premium Hoodie',
        productCategory: 'Hoodies',
        quantity: 100,
        unitPrice: 25,
        totalAmount: 2500,
        customization: { print: 'front' },
        colors: ['Black'],
        sizes: { M: 50, L: 50 },
        printLocations: ['front'],
    });
    it('POST /api/orders creates an order and initializes payments', async () => {
        const res = await (0, supertest_1.default)(app_1.app).post('/api/orders').send(sampleOrder());
        expect(res.status).toBe(201);
        expect(res.body.orderNumber).toMatch(/^ORD-/);
        expect(res.body.depositAmount).toBeCloseTo(1000);
        expect(res.body.balanceAmount).toBeCloseTo(1500);
        const payments = await (0, supertest_1.default)(app_1.app).get(`/api/orders/${res.body.id}/payments`);
        expect(payments.status).toBe(200);
        expect(payments.body.length).toBe(2);
        expect(payments.body.map((p) => p.phase).sort()).toEqual(['balance', 'deposit']);
    });
    it('GET /api/orders lists orders', async () => {
        await (0, supertest_1.default)(app_1.app).post('/api/orders').send(sampleOrder());
        await (0, supertest_1.default)(app_1.app).post('/api/orders').send(sampleOrder());
        const res = await (0, supertest_1.default)(app_1.app).get('/api/orders');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
    });
    it('GET /api/orders/:id retrieves one order', async () => {
        const created = await (0, supertest_1.default)(app_1.app).post('/api/orders').send(sampleOrder());
        const res = await (0, supertest_1.default)(app_1.app).get(`/api/orders/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(created.body.id);
    });
    it('PATCH /api/orders/:id updates order status', async () => {
        const created = await (0, supertest_1.default)(app_1.app).post('/api/orders').send(sampleOrder());
        const res = await (0, supertest_1.default)(app_1.app).patch(`/api/orders/${created.body.id}`).send({ status: 'in_production' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('in_production');
    });
});
