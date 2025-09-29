const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function createAdminUser() {
	console.log('👑 Creating Admin User...\n');

	const adminData = {
		email: 'admin@prismcraft.com',
		password: 'admin123456',
		firstName: 'Admin',
		lastName: 'User',
		role: 'admin'
	};

	try {
		// First, check if any users exist
		console.log('🔍 Checking existing users...');
		
		// Try to register admin (will work if no users exist)
		const response = await axios.post(`${BASE_URL}/auth/register`, adminData);
		
		console.log('✅ Admin user created successfully!');
		console.log(`   Email: ${response.data.user.email}`);
		console.log(`   Role: ${response.data.user.role}`);
		console.log(`   Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
		console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
		
		return response.data.token;
		
	} catch (error) {
		if (error.response?.status === 409) {
			console.log('ℹ️  Admin user already exists, attempting login...');
			
			try {
				const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
					email: adminData.email,
					password: adminData.password
				});
				
				console.log('✅ Admin login successful!');
				console.log(`   Role: ${loginResponse.data.user.role}`);
				return loginResponse.data.token;
				
			} catch (loginError) {
				console.error('❌ Admin login failed:', loginError.response?.data?.error);
				throw loginError;
			}
		} else {
			console.error('❌ Admin creation failed:', error.response?.data?.error);
			throw error;
		}
	}
}

// Run if called directly
if (require.main === module) {
	createAdminUser()
		.then(token => {
			console.log('\n🎉 Admin setup complete!');
			console.log('You can now use this admin account to:');
			console.log('• Create and manage products');
			console.log('• View all orders');
			console.log('• Manage user accounts');
			console.log('• Add timeline events and production updates');
		})
		.catch(error => {
			console.error('\n💥 Admin setup failed:', error.message);
			process.exit(1);
		});
}

module.exports = { createAdminUser };
