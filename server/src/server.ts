import { app } from './app';
import dotenv from 'dotenv';
import { attachIo } from './services/realtimeService';
import { createServer } from 'http';
import { connectToDatabase } from './config/db';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function startServer() {
	try {
		console.log('🚀 Starting Prism Craft Studio API Server...');
		console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
		
		// Connect to MongoDB
		await connectToDatabase();
		
		// Create HTTP server with Socket.io
		const httpServer = createServer(app);
		attachIo(httpServer);
		
		// Start listening
		httpServer.listen(PORT, () => {
			console.log(`🎯 Server listening on port ${PORT}`);
			console.log(`📡 Health check: http://localhost:${PORT}/health`);
			console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
			console.log('✨ Server ready to accept requests!');
		});
		
		// Graceful shutdown
		process.on('SIGTERM', async () => {
			console.log('🛑 SIGTERM received, shutting down gracefully...');
			httpServer.close(() => {
				console.log('👋 Server closed');
				process.exit(0);
			});
		});
		
	} catch (error) {
		console.error('💥 Failed to start server:', error);
		process.exit(1);
	}
}

startServer();