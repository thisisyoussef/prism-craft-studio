import { app } from './app';
import dotenv from 'dotenv';
import { attachIo } from './services/realtimeService';
import { createServer } from 'http';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const httpServer = createServer(app);
attachIo(httpServer);
httpServer.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});