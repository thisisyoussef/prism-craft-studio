"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const app_1 = require("../src/app");
const db_1 = require("../src/config/db");
const Product_1 = require("../src/models/Product");
describe('Products API', () => {
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
        await Product_1.Product.deleteMany({});
    });
    it('GET /api/products returns empty list initially', async () => {
        const res = await (0, supertest_1.default)(app_1.app).get('/api/products');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
    it('POST /api/products requires auth', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const res = await (0, supertest_1.default)(app_1.app)
            .post('/api/products')
            .send({ name: 'Shirt', category: 'T-Shirts', basePrice: 9.99 });
        expect(res.status).toBe(401);
        process.env.NODE_ENV = originalEnv;
    });
    it('POST /api/products creates a product with test auth bypass', async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .post('/api/products')
            .send({ name: 'Shirt', category: 'T-Shirts', basePrice: 9.99 });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Shirt');
        const list = await (0, supertest_1.default)(app_1.app).get('/api/products');
        expect(list.body.length).toBe(1);
    });
});
