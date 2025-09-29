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
describe('Designer Bookings API', () => {
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
        designerId: 'designer-1',
        consultationType: 'branding',
        scheduledDate: new Date().toISOString(),
        durationMinutes: 60,
        status: 'scheduled',
        price: 150,
    };
    it('POST /api/bookings creates a booking and GET lists it', async () => {
        const created = await (0, supertest_1.default)(app_1.app).post('/api/bookings').send(payload);
        expect(created.status).toBe(201);
        const list = await (0, supertest_1.default)(app_1.app).get('/api/bookings');
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);
    });
    it('PATCH /api/bookings/:id updates status', async () => {
        const created = await (0, supertest_1.default)(app_1.app).post('/api/bookings').send(payload);
        const patched = await (0, supertest_1.default)(app_1.app).patch(`/api/bookings/${created.body.id}`).send({ status: 'confirmed' });
        expect(patched.status).toBe(200);
        expect(patched.body.status).toBe('confirmed');
    });
});
