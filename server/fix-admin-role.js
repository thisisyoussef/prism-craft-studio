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

async function fixAdminRole() {
	try {
		console.log('🔄 Connecting to MongoDB...');
		await mongoose.connect(MONGODB_URI);
		console.log('✅ Connected to MongoDB');

		// Find and update the admin user
		const adminEmail = 'admin@prismcraft.com';
		
		// First, check if admin user exists
		let adminUser = await User.findOne({ email: adminEmail });
		
		if (!adminUser) {
			// Create admin user if doesn't exist
			console.log('👑 Creating new admin user...');
			const hashedPassword = await bcrypt.hash('admin123456', 12);
			
			adminUser = new User({
				email: adminEmail,
				password: hashedPassword,
				firstName: 'Admin',
				lastName: 'User',
				role: 'admin',
				isActive: true
			});
			
			await adminUser.save();
			console.log('✅ Admin user created successfully');
		} else {
			// Update existing user to admin role
			console.log('🔄 Updating existing user to admin role...');
			adminUser.role = 'admin';
			await adminUser.save();
			console.log('✅ User role updated to admin');
		}

		console.log(`📊 Admin user details:`);
		console.log(`   Email: ${adminUser.email}`);
		console.log(`   Role: ${adminUser.role}`);
		console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
		console.log(`   Active: ${adminUser.isActive}`);
		console.log(`   Created: ${adminUser.createdAt}`);

		// List all users for verification
		const allUsers = await User.find({}).select('email role firstName lastName isActive');
		console.log(`\n👥 All users in database (${allUsers.length}):`);
		allUsers.forEach(user => {
			console.log(`   ${user.email} - ${user.role} - ${user.firstName} ${user.lastName} (${user.isActive ? 'active' : 'inactive'})`);
		});

		await mongoose.disconnect();
		console.log('\n🎉 Admin role fix complete!');
		
	} catch (error) {
		console.error('❌ Error fixing admin role:', error);
		process.exit(1);
	}
}

fixAdminRole();
