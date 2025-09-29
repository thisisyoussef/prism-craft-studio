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
describe('Pricing Rules API', () => {
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
    it('GET /api/pricing returns empty list initially then returns inserted rules', async () => {
        const empty = await (0, supertest_1.default)(app_1.app).get('/api/pricing');
        expect(empty.status).toBe(200);
        expect(empty.body).toEqual([]);
        // Insert directly via POST (admin) not required; for test, insert through the model route to keep it simple
        // We'll add a limited POST for test environment only
        const created = await (0, supertest_1.default)(app_1.app).post('/api/pricing').send({ productType: 't-shirt', customizationType: 'screen-print', quantityMin: 50, basePrice: 12.99, customizationCost: 3.99, discountPercentage: 0, active: true });
        expect(created.status).toBe(201);
        const list = await (0, supertest_1.default)(app_1.app).get('/api/pricing');
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);
        expect(list.body[0].productType).toBe('t-shirt');
    });
});
