import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { registerRoutes } from './routes';
import { setupSwagger } from './config/swagger';
import path from 'path';

export const app = express();

app.use(helmet({
  // Allow images and other static assets to be embedded from other origins (e.g., Vite dev server at 8081)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(express.json());
// Raw body for Stripe webhook route
app.use('/api/webhooks/stripe', express.raw({ type: '*/*' }));
app.use(morgan('dev'));
// Serve uploaded files in dev
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// Also serve under /api/uploads so front-end proxies work seamlessly
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req: Request, res: Response) => {
	res.status(200).json({ status: 'ok' });
});

// Setup Swagger documentation
setupSwagger(app);

registerRoutes(app);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
	res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
	const status = err.status || 500;
	const message = err.message || 'Internal Server Error';
	res.status(status).json({ error: message });
});