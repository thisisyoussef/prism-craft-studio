import mongoose from 'mongoose';

export async function connectToDatabase(uri?: string) {
	const mongoUri = uri || process.env.MONGODB_URI;
	if (!mongoUri) throw new Error('MONGODB_URI is not set');
	await mongoose.connect(mongoUri);
}

export async function disconnectFromDatabase() {
	await mongoose.connection.close();
}