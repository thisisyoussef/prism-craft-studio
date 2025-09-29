"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const emailRoutes_1 = require("../src/routes/emailRoutes");
jest.mock('../src/services/emailService', () => ({
    sendEmail: jest.fn().mockResolvedValue({ id: 'test-email-id' })
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/emails', emailRoutes_1.emailRouter);
describe('Email routes', () => {
    it('requires auth', async () => {
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const res = await (0, supertest_1.default)(app).post('/api/emails/send').send({ to: 'a@b.com', subject: 'Hello' });
        expect(res.status).toBe(401);
        process.env.NODE_ENV = original;
    });
    it('sends email when authenticated in test env', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/emails/send').send({ to: 'a@b.com', subject: 'Hello' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, id: 'test-email-id' });
    });
});
