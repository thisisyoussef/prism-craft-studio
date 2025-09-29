const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Authentication credentials
const ADMIN_CREDENTIALS = { 
  email: 'admin@prismcraft.com', 
  password: 'admin123456',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

const CUSTOMERS = [
  { 
    email: 'john@company.com', 
    password: 'customer123456',
    firstName: 'John', 
    lastName: 'Smith', 
    companyName: 'Tech Startup Inc',
    phone: '+1-555-0101'
  },
  { 
    email: 'sarah@nonprofit.org', 
    password: 'customer123456',
    firstName: 'Sarah', 
    lastName: 'Johnson', 
    companyName: 'Community Foundation',
    phone: '+1-555-0102'
  },
  { 
    email: 'mike@restaurant.com', 
    password: 'customer123456',
    firstName: 'Mike', 
    lastName: 'Chen', 
    companyName: 'Urban Bistro',
    phone: '+1-555-0103'
  }
];

// Store authentication tokens
let adminToken = '';
let customerTokens = {};

// Product catalog to be added by admin
const PRODUCTS_TO_ADD = [
  {
    name: 'Premium Cotton T-Shirt',
    category: 'apparel',
    basePrice: 12.99,
    description: 'High-quality 100% cotton t-shirt, perfect for custom printing',
    colors: ['black', 'white', 'navy', 'heather-gray', 'red'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    minimumQuantity: 25,
    imageUrl: 'https://example.com/tshirt.jpg',
    specifications: {
      material: '100% Cotton',
      weight: '180gsm',
      printAreas: ['front', 'back', 'sleeve']
    }
  },
  {
    name: 'Eco-Friendly Hoodie',
    category: 'apparel',
    basePrice: 28.99,
    description: 'Sustainable hoodie made from recycled materials',
    colors: ['black', 'forest-green', 'charcoal', 'burgundy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    minimumQuantity: 15,
    imageUrl: 'https://example.com/hoodie.jpg',
    specifications: {
      material: '80% Recycled Cotton, 20% Recycled Polyester',
      weight: '320gsm',
      printAreas: ['front', 'back']
    }
  },
  {
    name: 'Custom Tote Bag',
    category: 'accessories',
    basePrice: 8.99,
    description: 'Durable canvas tote bag for everyday use',
    colors: ['natural', 'black', 'navy'],
    sizes: ['Standard'],
    minimumQuantity: 50,
    imageUrl: 'https://example.com/tote.jpg',
    specifications: {
      material: '12oz Canvas',
      dimensions: '15" x 16" x 3"',
      printAreas: ['front', 'back']
    }
  }
];

// Order scenarios
const ORDER_SCENARIOS = [
  {
    customer: CUSTOMERS[0],
    productName: 'Premium Cotton T-Shirt',
    quantity: 100,
    customization: {
      design: 'Company logo on front, team names on back',
      colors: ['black', 'navy'],
      sizes: { S: 20, M: 35, L: 30, XL: 15 },
      printLocations: ['front', 'back'],
      designNotes: 'Logo should be centered, 4-inch width. Team names in small text on upper back.'
    },
    customerNotes: 'Need these for our company retreat in 3 weeks. High quality print is essential.',
    urgency: 'standard'
  },
  {
    customer: CUSTOMERS[1],
    productName: 'Eco-Friendly Hoodie',
    quantity: 50,
    customization: {
      design: 'Nonprofit logo and mission statement',
      colors: ['forest-green'],
      sizes: { S: 10, M: 15, L: 15, XL: 10 },
      printLocations: ['front'],
      designNotes: 'Eco-friendly inks only. Logo on front chest, mission statement on back.'
    },
    customerNotes: 'These are for our volunteer appreciation event. Sustainability is very important to us.',
    urgency: 'standard'
  },
  {
    customer: CUSTOMERS[2],
    productName: 'Custom Tote Bag',
    quantity: 200,
    customization: {
      design: 'Restaurant logo and branding',
      colors: ['natural'],
      sizes: { Standard: 200 },
      printLocations: ['front'],
      designNotes: 'Simple, elegant design. Restaurant name and logo only.'
    },
    customerNotes: 'These will be given to customers as promotional items. Need them ASAP for grand opening.',
    urgency: 'rush'
  }
];

let createdProducts = [];
let createdOrders = [];

// Authentication helper functions
async function authenticateAdmin() {
	try {
		const response = await axios.post(`${BASE_URL}/auth/login`, {
			email: ADMIN_CREDENTIALS.email,
			password: ADMIN_CREDENTIALS.password
		});
		adminToken = response.data.token;
		console.log(`🔐 Admin authenticated: ${response.data.user.email}`);
		return adminToken;
	} catch (error) {
		console.error('❌ Admin authentication failed:', error.response?.data?.error);
		throw error;
	}
}

async function authenticateCustomer(customer) {
	try {
		// Try to register first, then login if already exists
		try {
			const response = await axios.post(`${BASE_URL}/auth/register`, customer);
			customerTokens[customer.email] = response.data.token;
			console.log(`✅ Customer registered: ${customer.firstName} ${customer.lastName}`);
		} catch (error) {
			if (error.response?.status === 409) {
				const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
					email: customer.email,
					password: customer.password
				});
				customerTokens[customer.email] = loginResponse.data.token;
				console.log(`🔐 Customer authenticated: ${customer.firstName} ${customer.lastName}`);
			} else {
				throw error;
			}
		}
		return customerTokens[customer.email];
	} catch (error) {
		console.error(`❌ Customer authentication failed for ${customer.email}:`, error.response?.data?.error);
		throw error;
	}
}

// Simulate full production flow
async function simulateFullFlow() {
	console.log('🚀 Starting Full Production Flow Simulation\n');
	
	try {
		// Step 0: Authenticate users
		console.log('🔑 Step 0: Authenticating Users');
		await authenticateAdmin();
		
		for (const customer of CUSTOMERS) {
			await authenticateCustomer(customer);
		}
		console.log(`✅ All users authenticated\n`);
		
		// Step 1: Admin adds products to inventory
		console.log('📦 Step 1: Admin Adding Products to Inventory');
		const createdProducts = [];
		
		for (const productData of PRODUCTS_TO_ADD) {
			const response = await axios.post(`${BASE_URL}/products`, productData, {
				headers: { Authorization: `Bearer ${adminToken}` }
			});
			createdProducts.push(response.data);
			console.log(`✅ Added: ${response.data.name} - $${response.data.basePrice}`);
		}
		
		console.log(`\n📊 Total products added: ${createdProducts.length}\n`);
		
		// Step 2: Customers place orders
		console.log('\n' + '=' .repeat(60));
		console.log('🛒 STEP 2: CUSTOMERS PLACE ORDERS');
		console.log('=' .repeat(60));

		for (let i = 0; i < ORDER_SCENARIOS.length; i++) {
			const scenario = ORDER_SCENARIOS[i];
			console.log(`\n👤 Customer: ${scenario.customer.name} (${scenario.customer.company})`);
			console.log(`📧 Email: ${scenario.customer.email}`);
			
			// Find the product
			const product = createdProducts.find(p => p.name === scenario.productName);
			if (!product) {
				console.log(`❌ Product ${scenario.productName} not found in inventory`);
				continue;
			}
    console.log('=' .repeat(60));
    console.log('🔧 STEP 1: ADMIN ADDS PRODUCTS TO INVENTORY');
    console.log('=' .repeat(60));
    
    for (const product of PRODUCTS_TO_ADD) {
      console.log(`\n📦 Adding product: ${product.name}`);
      try {
        const response = await axios.post(`${BASE_URL}/api/products`, product);
        createdProducts.push(response.data);
        console.log(`✅ Product added successfully - ID: ${response.data.id}`);
        console.log(`   Base Price: $${product.basePrice}`);
        console.log(`   Colors: ${product.colors.join(', ')}`);
        console.log(`   Min Quantity: ${product.minimumQuantity}`);
      } catch (error) {
        console.log(`❌ Failed to add product: ${error.response?.data?.error || error.message}`);
      }
    }

    // Step 2: Customers place orders
    console.log('\n' + '=' .repeat(60));
    console.log('🛒 STEP 2: CUSTOMERS PLACE ORDERS');
    console.log('=' .repeat(60));

    for (let i = 0; i < ORDER_SCENARIOS.length; i++) {
      const scenario = ORDER_SCENARIOS[i];
      console.log(`\n👤 Customer: ${scenario.customer.name} (${scenario.customer.company})`);
      console.log(`📧 Email: ${scenario.customer.email}`);
      
      // Find the product
      const product = createdProducts.find(p => p.name === scenario.productName);
      if (!product) {
        console.log(`❌ Product ${scenario.productName} not found in inventory`);
        continue;
      }

      const unitPrice = product.basePrice + (scenario.urgency === 'rush' ? 3.00 : 0);
      const totalAmount = unitPrice * scenario.quantity;

      const orderData = {
        customerId: scenario.customer.id,
        customerEmail: scenario.customer.email,
        customerName: scenario.customer.name,
        companyName: scenario.customer.company,
        productId: product.id,
        productCategory: product.category,
        productName: product.name,
        quantity: scenario.quantity,
        unitPrice: unitPrice,
        totalAmount: totalAmount,
        customization: scenario.customization,
        colors: scenario.customization.colors,
        sizes: scenario.customization.sizes,
        printLocations: scenario.customization.printLocations,
        customerNotes: scenario.customerNotes,
        priority: scenario.urgency === 'rush' ? 'high' : 'medium'
      };

      try {
        const response = await axios.post(`${BASE_URL}/api/orders`, orderData);
        createdOrders.push(response.data);
        console.log(`✅ Order created successfully - ${response.data.orderNumber}`);
        console.log(`   Product: ${scenario.productName}`);
        console.log(`   Quantity: ${scenario.quantity}`);
        console.log(`   Total: $${totalAmount.toFixed(2)}`);
        console.log(`   Deposit: $${response.data.depositAmount}`);
        console.log(`   Balance: $${response.data.balanceAmount}`);
        
        // Add initial timeline event
        await axios.post(`${BASE_URL}/api/orders/${response.data.id}/timeline`, {
          eventType: 'order_created',
          description: `Order placed by ${scenario.customer.name}`,
          eventData: { 
            customerEmail: scenario.customer.email,
            priority: scenario.urgency 
          },
          triggerSource: 'system'
        });

      } catch (error) {
        console.log(`❌ Failed to create order: ${error.response?.data?.error || error.message}`);
      }

      // Small delay between orders
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Admin reviews and processes orders
    console.log('\n' + '=' .repeat(60));
    console.log('👨‍💼 STEP 3: ADMIN REVIEWS AND PROCESSES ORDERS');
    console.log('=' .repeat(60));

    for (const order of createdOrders) {
      console.log(`\n📋 Processing Order: ${order.orderNumber}`);
      
      // Admin reviews order
      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'under_review',
        adminNotes: 'Order received and under initial review'
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'status_change',
        description: 'Order moved to review by admin',
        eventData: { 
          previousStatus: 'deposit_pending',
          newStatus: 'under_review',
          adminId: ADMIN_USER.id
        },
        triggerSource: 'admin'
      });

      console.log(`✅ Order ${order.orderNumber} moved to review`);

      // Simulate deposit payment
      console.log(`💳 Processing deposit payment...`);
      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'design_phase',
        depositPaidAt: new Date().toISOString(),
        adminNotes: 'Deposit received. Moving to design phase.'
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'payment_received',
        description: `Deposit payment of $${order.depositAmount} received`,
        eventData: { 
          amount: order.depositAmount,
          paymentType: 'deposit'
        },
        triggerSource: 'system'
      });

      console.log(`✅ Deposit payment processed: $${order.depositAmount}`);
    }

    // Step 4: Design and approval workflow
    console.log('\n' + '=' .repeat(60));
    console.log('🎨 STEP 4: DESIGN AND APPROVAL WORKFLOW');
    console.log('=' .repeat(60));

    for (const order of createdOrders) {
      console.log(`\n🎨 Creating design for Order: ${order.orderNumber}`);
      
      // Admin creates initial design
      await axios.post(`${BASE_URL}/api/orders/${order.id}/production-updates`, {
        stage: 'design',
        status: 'in_progress',
        description: 'Initial design mockup created based on customer requirements',
        photos: ['design-mockup-v1.jpg'],
        visibleToCustomer: true
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'design_created',
        description: 'Initial design mockup created and sent for customer review',
        eventData: { 
          designVersion: 'v1',
          designFiles: ['design-mockup-v1.jpg']
        },
        triggerSource: 'admin'
      });

      console.log(`✅ Design mockup created and sent for review`);

      // Simulate customer approval (after some time)
      await new Promise(resolve => setTimeout(resolve, 200));

      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'design_approved',
        customerNotes: 'Design looks great! Approved to proceed with production.'
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'design_approved',
        description: 'Customer approved the design mockup',
        eventData: { 
          approvedBy: order.customerEmail,
          designVersion: 'v1'
        },
        triggerSource: 'system'
      });

      console.log(`✅ Design approved by customer`);
    }

    // Step 5: Production phase
    console.log('\n' + '=' .repeat(60));
    console.log('🏭 STEP 5: PRODUCTION PHASE');
    console.log('=' .repeat(60));

    for (const order of createdOrders) {
      console.log(`\n🏭 Starting production for Order: ${order.orderNumber}`);
      
      // Move to production
      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'in_production',
        adminNotes: 'Order moved to production queue'
      });

      // Production stages
      const productionStages = [
        { stage: 'material_prep', description: 'Materials prepared and quality checked' },
        { stage: 'printing', description: 'Custom printing in progress' },
        { stage: 'quality_control', description: 'Quality control and inspection completed' },
        { stage: 'packaging', description: 'Items packaged and ready for shipping' }
      ];

      for (const prodStage of productionStages) {
        await axios.post(`${BASE_URL}/api/orders/${order.id}/production-updates`, {
          stage: prodStage.stage,
          status: 'completed',
          description: prodStage.description,
          photos: [`${prodStage.stage}-${order.orderNumber}.jpg`],
          visibleToCustomer: true
        });

        await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
          eventType: 'production_update',
          description: `Production stage completed: ${prodStage.stage}`,
          eventData: { 
            stage: prodStage.stage,
            completedAt: new Date().toISOString()
          },
          triggerSource: 'admin'
        });

        console.log(`✅ Production stage completed: ${prodStage.stage}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Request balance payment
      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'balance_pending',
        adminNotes: 'Production completed. Balance payment requested.'
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'balance_requested',
        description: `Balance payment of $${order.balanceAmount} requested`,
        eventData: { 
          amount: order.balanceAmount,
          paymentType: 'balance'
        },
        triggerSource: 'admin'
      });

      console.log(`💳 Balance payment requested: $${order.balanceAmount}`);
    }

    // Step 6: Final payment and shipping
    console.log('\n' + '=' .repeat(60));
    console.log('📦 STEP 6: FINAL PAYMENT AND SHIPPING');
    console.log('=' .repeat(60));

    for (const order of createdOrders) {
      console.log(`\n📦 Finalizing Order: ${order.orderNumber}`);
      
      // Process balance payment
      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'ready_to_ship',
        balancePaidAt: new Date().toISOString(),
        trackingNumber: `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        adminNotes: 'Balance payment received. Order ready for shipping.'
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'payment_received',
        description: `Balance payment of $${order.balanceAmount} received`,
        eventData: { 
          amount: order.balanceAmount,
          paymentType: 'balance'
        },
        triggerSource: 'system'
      });

      console.log(`✅ Balance payment processed: $${order.balanceAmount}`);

      // Ship the order
      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'shipped',
        adminNotes: 'Order shipped via express delivery'
      });

      const updatedOrder = await axios.get(`${BASE_URL}/api/orders/${order.id}`);
      const trackingNumber = updatedOrder.data.trackingNumber;

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'order_shipped',
        description: `Order shipped with tracking number: ${trackingNumber}`,
        eventData: { 
          trackingNumber: trackingNumber,
          carrier: 'Express Delivery',
          estimatedDelivery: updatedOrder.data.estimatedDelivery
        },
        triggerSource: 'admin'
      });

      console.log(`📦 Order shipped with tracking: ${trackingNumber}`);

      // Simulate delivery
      await new Promise(resolve => setTimeout(resolve, 500));

      await axios.patch(`${BASE_URL}/api/orders/${order.id}`, {
        status: 'delivered',
        actualDelivery: new Date().toISOString(),
        adminNotes: 'Order successfully delivered to customer'
      });

      await axios.post(`${BASE_URL}/api/orders/${order.id}/timeline`, {
        eventType: 'order_delivered',
        description: 'Order successfully delivered to customer',
        eventData: { 
          deliveredAt: new Date().toISOString(),
          trackingNumber: trackingNumber
        },
        triggerSource: 'system'
      });

      console.log(`✅ Order delivered successfully!`);
    }

    // Step 7: Final summary and analytics
    console.log('\n' + '=' .repeat(60));
    console.log('📊 STEP 7: FINAL SUMMARY AND ANALYTICS');
    console.log('=' .repeat(60));

    // Get all orders summary
    const allOrders = await axios.get(`${BASE_URL}/api/orders`);
    console.log(`\n📈 BUSINESS SUMMARY:`);
    console.log(`Total Orders Processed: ${allOrders.data.length}`);
    
    let totalRevenue = 0;
    let totalItems = 0;
    
    for (const order of allOrders.data) {
      totalRevenue += order.totalAmount;
      totalItems += order.quantity;
      
      console.log(`\n📋 Order: ${order.orderNumber}`);
      console.log(`   Customer: ${order.customerName || 'N/A'}`);
      console.log(`   Product: ${order.productName}`);
      console.log(`   Quantity: ${order.quantity}`);
      console.log(`   Revenue: $${order.totalAmount}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${new Date(order.createdAt).toLocaleDateString()}`);
      
      if (order.trackingNumber) {
        console.log(`   Tracking: ${order.trackingNumber}`);
      }
    }

    console.log(`\n💰 FINANCIAL SUMMARY:`);
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Items Produced: ${totalItems}`);
    console.log(`Average Order Value: $${(totalRevenue / allOrders.data.length).toFixed(2)}`);

    console.log('\n🎉 FULL PRODUCTION FLOW SIMULATION COMPLETED SUCCESSFULLY!');
    console.log('\nAll orders have been processed from initial creation through delivery.');
    console.log('The system has demonstrated:');
    console.log('✅ Product inventory management');
    console.log('✅ Order processing and workflow');
    console.log('✅ Design approval process');
    console.log('✅ Payment processing (deposit + balance)');
    console.log('✅ Production tracking with updates');
    console.log('✅ Shipping and delivery tracking');
    console.log('✅ Complete order lifecycle management');

  } catch (error) {
    console.error('❌ Simulation failed:', error.response?.data || error.message);
  }
}

// Run the simulation
simulateFullFlow();
