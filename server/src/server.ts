import { app } from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});