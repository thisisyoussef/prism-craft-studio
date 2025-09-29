import mongoose from 'mongoose';

export async function connectToDatabase(uri?: string) {
	const mongoUri = uri || process.env.MONGODB_URI || 'mongodb+srv://youssefiahmedis_db_user:3gUXx0zIzz0C4jGD@cluster0.nmqffov.mongodb.net/prism-craft-production';
	
	if (!mongoUri) {
		throw new Error('MONGODB_URI is not set');
	}

	try {
		console.log('🔄 Connecting to MongoDB...');
		await mongoose.connect(mongoUri);
		console.log('✅ Connected to MongoDB successfully');
		
		// Log connection details (without credentials)
		const connection = mongoose.connection;
		console.log(`📊 Database: ${connection.name}`);
		console.log(`🌐 Host: ${connection.host}:${connection.port}`);
		
		// Handle connection events
		connection.on('error', (error) => {
			console.error('❌ MongoDB connection error:', error);
		});
		
		connection.on('disconnected', () => {
			console.log('⚠️ MongoDB disconnected');
		});
		
		connection.on('reconnected', () => {
			console.log('🔄 MongoDB reconnected');
		});
		
	} catch (error) {
		console.error('❌ Failed to connect to MongoDB:', error);
		throw error;
	}
}

export async function disconnectFromDatabase() {
	try {
		console.log('🔄 Disconnecting from MongoDB...');
		await mongoose.connection.close();
		console.log('✅ Disconnected from MongoDB successfully');
	} catch (error) {
		console.error('❌ Error disconnecting from MongoDB:', error);
		throw error;
	}
}