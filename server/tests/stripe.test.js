"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("../src/app");
const db_1 = require("../src/config/db");
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({ id: 'cs_test_123', url: 'https://stripe.test/session' })
            }
        },
        invoices: {
            create: jest.fn().mockResolvedValue({ id: 'in_test_123', hosted_invoice_url: 'https://stripe.test/invoice' })
        }
    }));
});
describe('Stripe endpoints', () => {
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
    it('POST /api/payments/create-checkout returns session url', async () => {
        const order = await (0, supertest_1.default)(app_1.app).post('/api/orders').send({ productName: 'Hoodie', productCategory: 'Hoodies', quantity: 10, unitPrice: 25, totalAmount: 250 });
        const res = await (0, supertest_1.default)(app_1.app).post('/api/payments/create-checkout').send({ orderId: order.body.id, phase: 'deposit' });
        expect(res.status).toBe(200);
        expect(res.body.url).toContain('stripe.test');
    });
    it('POST /api/payments/create-invoice returns invoice url', async () => {
        const order = await (0, supertest_1.default)(app_1.app).post('/api/orders').send({ productName: 'Hoodie', productCategory: 'Hoodies', quantity: 10, unitPrice: 25, totalAmount: 250 });
        const res = await (0, supertest_1.default)(app_1.app).post('/api/payments/create-invoice').send({ orderId: order.body.id });
        expect(res.status).toBe(200);
        expect(res.body.invoiceUrl).toContain('stripe.test');
    });
    it('POST /api/webhooks/stripe returns 200', async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .post('/api/webhooks/stripe')
            .set('stripe-signature', 't=test')
            .send({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } });
        expect(res.status).toBe(200);
    });
});
