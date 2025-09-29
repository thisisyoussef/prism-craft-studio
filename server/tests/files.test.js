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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
describe('File Uploads API', () => {
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
    it('POST /api/files/upload uploads a file and returns url; GET by order returns list', async () => {
        const tmpFile = path_1.default.join(__dirname, 'tmp.txt');
        fs_1.default.writeFileSync(tmpFile, 'hello');
        // need an order id to associate
        const order = await (0, supertest_1.default)(app_1.app).post('/api/orders').send({ productName: 'Polo', productCategory: 'Polos', quantity: 10, unitPrice: 18, totalAmount: 180 });
        const orderId = order.body.id;
        const res = await (0, supertest_1.default)(app_1.app)
            .post('/api/files/upload')
            .field('orderId', orderId)
            .field('filePurpose', 'artwork')
            .attach('file', tmpFile);
        expect(res.status).toBe(200);
        expect(res.body.fileUrl).toContain('/uploads/');
        fs_1.default.unlinkSync(tmpFile);
        const list = await (0, supertest_1.default)(app_1.app).get(`/api/files/order/${orderId}`);
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);
    });
});
