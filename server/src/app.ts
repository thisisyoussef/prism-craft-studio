import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { registerRoutes } from './routes';
import path from 'path';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
// Raw body for Stripe webhook route
app.use('/api/webhooks/stripe', express.raw({ type: '*/*' }));
app.use(morgan('dev'));
// Serve uploaded files in dev
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req: Request, res: Response) => {
	res.status(200).json({ status: 'ok' });
});

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