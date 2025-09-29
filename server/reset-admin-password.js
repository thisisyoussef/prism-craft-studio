const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://youssefiahmedis_db_user:3gUXx0zIzz0C4jGD@cluster0.nmqffov.mongodb.net/prism-craft-production';

const UserSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true, lowercase: true },
	password: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
	companyName: String,
	phone: String,
	address: {
		street: String,
		city: String,
		state: String,
		zipCode: String,
		country: { type: String, default: 'US' }
	},
	isActive: { type: Boolean, default: true },
	lastLogin: Date
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function resetAdminPassword() {
	try {
		console.log('🔄 Connecting to MongoDB...');
		await mongoose.connect(MONGODB_URI);
		console.log('✅ Connected to MongoDB');

		const adminEmail = 'admin@prismcraft.com';
		const newPassword = 'admin123456';
		
		// Find admin user
		const adminUser = await User.findOne({ email: adminEmail });
		
		if (!adminUser) {
			console.log('❌ Admin user not found');
			process.exit(1);
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 12);
		
		// Update password
		adminUser.password = hashedPassword;
		adminUser.role = 'admin'; // Ensure admin role
		await adminUser.save();

		console.log('✅ Admin password reset successfully');
		console.log(`📊 Admin user details:`);
		console.log(`   Email: ${adminUser.email}`);
		console.log(`   Role: ${adminUser.role}`);
		console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
		console.log(`   Password: ${newPassword}`);

		await mongoose.disconnect();
		console.log('\n🎉 Admin password reset complete!');
		
	} catch (error) {
		console.error('❌ Error resetting admin password:', error);
		process.exit(1);
	}
}

resetAdminPassword();
