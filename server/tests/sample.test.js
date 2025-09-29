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
describe('Samples API', () => {
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
    const payload = {
        products: [{ name: 'Classic T-Shirt', qty: 2, price: 12.99 }],
        totalPrice: 25.98,
        status: 'ordered',
    };
    it('POST /api/samples creates a sample and GET lists it', async () => {
        const created = await (0, supertest_1.default)(app_1.app).post('/api/samples').send(payload);
        expect(created.status).toBe(201);
        expect(created.body.sampleNumber).toMatch(/^SMPL-/);
        const list = await (0, supertest_1.default)(app_1.app).get('/api/samples');
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);
    });
    it('GET /api/samples/:id returns the sample and PATCH updates status', async () => {
        const created = await (0, supertest_1.default)(app_1.app).post('/api/samples').send(payload);
        const getOne = await (0, supertest_1.default)(app_1.app).get(`/api/samples/${created.body.id}`);
        expect(getOne.status).toBe(200);
        const patched = await (0, supertest_1.default)(app_1.app).patch(`/api/samples/${created.body.id}`).send({ status: 'shipped', trackingNumber: 'TRACK123' });
        expect(patched.status).toBe(200);
        expect(patched.body.status).toBe('shipped');
        expect(patched.body.trackingNumber).toBe('TRACK123');
    });
});
