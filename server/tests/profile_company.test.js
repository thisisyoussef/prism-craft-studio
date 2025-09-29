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
describe('Profiles & Company API', () => {
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
    it('PATCH /api/profile creates profile with company, then GET endpoints return data, and PATCH /api/company updates', async () => {
        // Create profile with company
        const upsert = await (0, supertest_1.default)(app_1.app)
            .patch('/api/profile')
            .send({ firstName: 'Ada', lastName: 'Lovelace', companyName: 'Analytical Engines Inc.' });
        expect(upsert.status).toBe(200);
        expect(upsert.body.firstName).toBe('Ada');
        expect(upsert.body.companyId).toBeTruthy();
        // GET profile
        const getProfile = await (0, supertest_1.default)(app_1.app).get('/api/profile');
        expect(getProfile.status).toBe(200);
        expect(getProfile.body.firstName).toBe('Ada');
        // GET company
        const getCompany = await (0, supertest_1.default)(app_1.app).get('/api/company');
        expect(getCompany.status).toBe(200);
        expect(getCompany.body.name).toBe('Analytical Engines Inc.');
        // PATCH company name
        const patchCompany = await (0, supertest_1.default)(app_1.app)
            .patch('/api/company')
            .send({ name: 'Analytical Engines, Ltd.' });
        expect(patchCompany.status).toBe(200);
        expect(patchCompany.body.name).toBe('Analytical Engines, Ltd.');
    });
});
