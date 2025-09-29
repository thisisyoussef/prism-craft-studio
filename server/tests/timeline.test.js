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
describe('Order Timeline API', () => {
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
    async function createOrderId() {
        const res = await (0, supertest_1.default)(app_1.app).post('/api/orders').send({
            productName: 'Premium Hoodie',
            productCategory: 'Hoodies',
            quantity: 50,
            unitPrice: 25,
            totalAmount: 1250,
        });
        return res.body.id;
    }
    it('POST then GET timeline events for an order', async () => {
        const orderId = await createOrderId();
        const post = await (0, supertest_1.default)(app_1.app)
            .post(`/api/orders/${orderId}/timeline`)
            .send({ eventType: 'note', description: 'Created by admin', eventData: { source: 'test' } });
        expect(post.status).toBe(201);
        expect(post.body.eventType).toBe('note');
        expect(post.body.description).toBe('Created by admin');
        const list = await (0, supertest_1.default)(app_1.app).get(`/api/orders/${orderId}/timeline`);
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);
        expect(list.body[0].id).toBe(post.body.id);
    });
});
