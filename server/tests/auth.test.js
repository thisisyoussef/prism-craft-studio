"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = require("../src/middleware/auth");
describe('requireAuth middleware', () => {
    const app = (0, express_1.default)();
    app.get('/secure', auth_1.requireAuth, (req, res) => {
        res.json({ userId: req.user?.id });
    });
    it('returns 401 when Authorization header missing', async () => {
        // Temporarily set NODE_ENV to production to disable bypass
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const res = await (0, supertest_1.default)(app).get('/secure');
        expect(res.status).toBe(401);
        process.env.NODE_ENV = original;
    });
    it('allows request in test env bypass and attaches user', async () => {
        const res = await (0, supertest_1.default)(app).get('/secure');
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe('test-user');
    });
});
