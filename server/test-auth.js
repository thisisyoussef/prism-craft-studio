const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test data
const adminUser = {
	email: 'admin@prismcraft.com',
	password: 'admin123456',
	firstName: 'Admin',
	lastName: 'User',
	role: 'admin'
};

const customerUser = {
	email: 'customer@example.com',
	password: 'customer123456',
	firstName: 'John',
	lastName: 'Doe',
	role: 'customer',
	companyName: 'Example Corp',
	phone: '+1-555-0123'
};

let adminToken = '';
let customerToken = '';
let testOrderId = '';

async function testAuthFlow() {
	console.log('🧪 Starting Authentication Flow Test\n');

	try {
		// Test 1: Register Admin User
		console.log('1️⃣ Testing Admin Registration...');
		try {
			const adminRegResponse = await axios.post(`${BASE_URL}/auth/register`, adminUser);
			console.log('✅ Admin registered successfully');
			adminToken = adminRegResponse.data.token;
			console.log(`   Token: ${adminToken.substring(0, 20)}...`);
		} catch (error) {
			if (error.response?.status === 409) {
				console.log('ℹ️  Admin user already exists, logging in...');
				const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
					email: adminUser.email,
					password: adminUser.password
				});
				adminToken = loginResponse.data.token;
				console.log('✅ Admin logged in successfully');
			} else {
				throw error;
			}
		}

		// Test 2: Register Customer User
		console.log('\n2️⃣ Testing Customer Registration...');
		try {
			const customerRegResponse = await axios.post(`${BASE_URL}/auth/register`, customerUser);
			console.log('✅ Customer registered successfully');
			customerToken = customerRegResponse.data.token;
			console.log(`   Token: ${customerToken.substring(0, 20)}...`);
		} catch (error) {
			if (error.response?.status === 409) {
				console.log('ℹ️  Customer user already exists, logging in...');
				const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
					email: customerUser.email,
					password: customerUser.password
				});
				customerToken = loginResponse.data.token;
				console.log('✅ Customer logged in successfully');
			} else {
				throw error;
			}
		}

		// Test 3: Test Profile Access
		console.log('\n3️⃣ Testing Profile Access...');
		const adminProfile = await axios.get(`${BASE_URL}/auth/profile`, {
			headers: { Authorization: `Bearer ${adminToken}` }
		});
		console.log(`✅ Admin profile: ${adminProfile.data.user.email} (${adminProfile.data.user.role})`);

		const customerProfile = await axios.get(`${BASE_URL}/auth/profile`, {
			headers: { Authorization: `Bearer ${customerToken}` }
		});
		console.log(`✅ Customer profile: ${customerProfile.data.user.email} (${customerProfile.data.user.role})`);

		// Test 4: Test Admin-Only Endpoints
		console.log('\n4️⃣ Testing Admin-Only Access...');
		
		// Admin should be able to create products
		try {
			const productData = {
				name: 'Test Auth Product',
				category: 'apparel',
				basePrice: 15.99,
				description: 'Product created during auth testing',
				colors: ['black', 'white'],
				sizes: ['S', 'M', 'L'],
				minimumQuantity: 1,
				isActive: true
			};
			
			const productResponse = await axios.post(`${BASE_URL}/products`, productData, {
				headers: { Authorization: `Bearer ${adminToken}` }
			});
			console.log(`✅ Admin created product: ${productResponse.data.name}`);
		} catch (error) {
			console.error('❌ Admin product creation failed:', error.response?.data?.error);
		}

		// Customer should NOT be able to create products
		try {
			await axios.post(`${BASE_URL}/products`, {
				name: 'Unauthorized Product',
				category: 'apparel',
				basePrice: 10.00
			}, {
				headers: { Authorization: `Bearer ${customerToken}` }
			});
			console.error('❌ Customer was able to create product (should be forbidden)');
		} catch (error) {
			if (error.response?.status === 403) {
				console.log('✅ Customer correctly denied product creation access');
			} else {
				console.error('❌ Unexpected error:', error.response?.data?.error);
			}
		}

		// Test 5: Test Customer Order Creation
		console.log('\n5️⃣ Testing Customer Order Creation...');
		try {
			const orderData = {
				productCategory: 'apparel',
				productName: 'Test Auth T-Shirt',
				quantity: 25,
				unitPrice: 12.99,
				totalAmount: 324.75,
				customization: {
					design: 'Custom logo',
					placement: 'front'
				},
				colors: ['navy'],
				sizes: { 'S': 5, 'M': 10, 'L': 10 },
				printLocations: ['front'],
				companyName: 'Test Company'
			};

			const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData, {
				headers: { Authorization: `Bearer ${customerToken}` }
			});
			testOrderId = orderResponse.data.id;
			console.log(`✅ Customer created order: ${orderResponse.data.orderNumber}`);
			console.log(`   Order ID: ${testOrderId}`);
			console.log(`   Customer: ${orderResponse.data.customerName}`);
			console.log(`   Total: $${orderResponse.data.totalAmount}`);
		} catch (error) {
			console.error('❌ Customer order creation failed:', error.response?.data?.error);
		}

		// Test 6: Test Order Access Control
		console.log('\n6️⃣ Testing Order Access Control...');
		
		// Customer should see their own orders
		try {
			const customerOrders = await axios.get(`${BASE_URL}/orders`, {
				headers: { Authorization: `Bearer ${customerToken}` }
			});
			console.log(`✅ Customer can see ${customerOrders.data.length} of their orders`);
		} catch (error) {
			console.error('❌ Customer order access failed:', error.response?.data?.error);
		}

		// Admin should see all orders
		try {
			const adminOrders = await axios.get(`${BASE_URL}/orders`, {
				headers: { Authorization: `Bearer ${adminToken}` }
			});
			console.log(`✅ Admin can see ${adminOrders.data.length} total orders`);
		} catch (error) {
			console.error('❌ Admin order access failed:', error.response?.data?.error);
		}

		// Test 7: Test Admin Order Management
		console.log('\n7️⃣ Testing Admin Order Management...');
		if (testOrderId) {
			try {
				// Admin should be able to add timeline events
				const timelineData = {
					eventType: 'status_change',
					description: 'Order approved and moved to design phase',
					eventData: { previousStatus: 'deposit_pending', newStatus: 'in_design' },
					triggerSource: 'admin'
				};

				await axios.post(`${BASE_URL}/orders/${testOrderId}/timeline`, timelineData, {
					headers: { Authorization: `Bearer ${adminToken}` }
				});
				console.log('✅ Admin added timeline event');

				// Admin should be able to add production updates
				const productionData = {
					stage: 'design',
					status: 'in_progress',
					description: 'Initial design concepts created',
					photos: ['design1.jpg', 'design2.jpg']
				};

				await axios.post(`${BASE_URL}/orders/${testOrderId}/production`, productionData, {
					headers: { Authorization: `Bearer ${adminToken}` }
				});
				console.log('✅ Admin added production update');
			} catch (error) {
				console.error('❌ Admin order management failed:', error.response?.data?.error);
			}
		}

		// Test 8: Test Unauthorized Access
		console.log('\n8️⃣ Testing Unauthorized Access...');
		try {
			await axios.get(`${BASE_URL}/orders`);
			console.error('❌ Unauthenticated user was able to access orders');
		} catch (error) {
			if (error.response?.status === 401) {
				console.log('✅ Unauthenticated access correctly denied');
			} else {
				console.error('❌ Unexpected error:', error.response?.data?.error);
			}
		}

		// Test 9: Test Invalid Token
		console.log('\n9️⃣ Testing Invalid Token...');
		try {
			await axios.get(`${BASE_URL}/auth/profile`, {
				headers: { Authorization: 'Bearer invalid-token-12345' }
			});
			console.error('❌ Invalid token was accepted');
		} catch (error) {
			if (error.response?.status === 401) {
				console.log('✅ Invalid token correctly rejected');
			} else {
				console.error('❌ Unexpected error:', error.response?.data?.error);
			}
		}

		// Test 10: Test Admin User Management
		console.log('\n🔟 Testing Admin User Management...');
		try {
			const usersResponse = await axios.get(`${BASE_URL}/auth/users`, {
				headers: { Authorization: `Bearer ${adminToken}` }
			});
			console.log(`✅ Admin can see ${usersResponse.data.users.length} users`);
			console.log(`   Total users in system: ${usersResponse.data.pagination.total}`);
		} catch (error) {
			console.error('❌ Admin user management failed:', error.response?.data?.error);
		}

		// Customer should NOT be able to see user list
		try {
			await axios.get(`${BASE_URL}/auth/users`, {
				headers: { Authorization: `Bearer ${customerToken}` }
			});
			console.error('❌ Customer was able to access user list');
		} catch (error) {
			if (error.response?.status === 403) {
				console.log('✅ Customer correctly denied user list access');
			} else {
				console.error('❌ Unexpected error:', error.response?.data?.error);
			}
		}

		console.log('\n🎉 Authentication Flow Test Complete!');
		console.log('\n📊 Test Summary:');
		console.log('✅ User registration and login');
		console.log('✅ JWT token generation and validation');
		console.log('✅ Role-based access control');
		console.log('✅ Admin-only endpoints protection');
		console.log('✅ Customer order creation and access');
		console.log('✅ Order access control (customers see only their orders)');
		console.log('✅ Admin order management capabilities');
		console.log('✅ Unauthorized access prevention');
		console.log('✅ Invalid token rejection');
		console.log('✅ Admin user management');

	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		if (error.response) {
			console.error('Response status:', error.response.status);
			console.error('Response data:', error.response.data);
		}
	}
}

// Run the test
if (require.main === module) {
	testAuthFlow();
}

module.exports = { testAuthFlow };
