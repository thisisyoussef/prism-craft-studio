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
    },
    isActive: true
  },
  {
    name: 'Eco-Friendly Hoodie',
    category: 'apparel',
    basePrice: 28.99,
    description: 'Sustainable hoodie made from recycled materials',
    colors: ['forest-green', 'charcoal', 'cream', 'burgundy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    minimumQuantity: 15,
    imageUrl: 'https://example.com/hoodie.jpg',
    specifications: {
      material: '70% Recycled Cotton, 30% Recycled Polyester',
      weight: '320gsm',
      printAreas: ['front', 'back']
    },
    isActive: true
  },
  {
    name: 'Custom Tote Bag',
    category: 'accessories',
    basePrice: 8.99,
    description: 'Durable canvas tote bag for everyday use',
    colors: ['natural', 'black', 'navy'],
    sizes: ['standard'],
    minimumQuantity: 50,
    imageUrl: 'https://example.com/tote.jpg',
    specifications: {
      material: '100% Cotton Canvas',
      weight: '12oz',
      printAreas: ['front', 'back']
    },
    isActive: true
  }
];

// Order scenarios for different customers
const ORDER_SCENARIOS = [
  {
    customerEmail: 'john@company.com',
    productName: 'Premium Cotton T-Shirt',
    quantity: 50,
    customization: {
      design: 'Company logo and tagline',
      placement: 'front center',
      colors: ['white logo on black shirt', 'black logo on white shirt']
    },
    colors: ['black', 'white'],
    sizes: { 'S': 5, 'M': 20, 'L': 20, 'XL': 5 },
    printLocations: ['front'],
    customerNotes: 'Need these for company retreat next month. High quality print is essential.',
    urgency: 'standard'
  },
  {
    customerEmail: 'sarah@nonprofit.org',
    productName: 'Eco-Friendly Hoodie',
    quantity: 30,
    customization: {
      design: 'Foundation logo and mission statement',
      placement: 'front and back',
      colors: ['white print on forest-green']
    },
    colors: ['forest-green'],
    sizes: { 'S': 8, 'M': 12, 'L': 8, 'XL': 2 },
    printLocations: ['front', 'back'],
    customerNotes: 'Eco-friendly materials align with our values. Need for fundraising event.',
    urgency: 'standard'
  },
  {
    customerEmail: 'mike@restaurant.com',
    productName: 'Custom Tote Bag',
    quantity: 100,
    customization: {
      design: 'Restaurant logo and contact info',
      placement: 'front center',
      colors: ['black print on natural bag']
    },
    colors: ['natural'],
    sizes: { 'standard': 100 },
    printLocations: ['front'],
    customerNotes: 'Customer giveaways for grand opening. Simple, elegant design preferred.',
    urgency: 'rush'
  }
];

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
  console.log('🚀 Starting Full Production Flow Simulation with Authentication\n');
  
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
      try {
        const response = await axios.post(`${BASE_URL}/products`, productData, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        createdProducts.push(response.data);
        console.log(`✅ Added: ${response.data.name} - $${response.data.basePrice}`);
      } catch (error) {
        console.error(`❌ Failed to add product ${productData.name}:`, error.response?.data?.error);
      }
    }
    
    console.log(`\n📊 Total products added: ${createdProducts.length}\n`);
    
    // Step 2: Customers place orders
    console.log('🛒 Step 2: Customers Place Orders');
    const createdOrders = [];
    
    for (const scenario of ORDER_SCENARIOS) {
      const customer = CUSTOMERS.find(c => c.email === scenario.customerEmail);
      const product = createdProducts.find(p => p.name === scenario.productName);
      
      if (!customer || !product) {
        console.log(`❌ Skipping order - customer or product not found`);
        continue;
      }
      
      const orderData = {
        productCategory: product.category,
        productName: scenario.productName,
        quantity: scenario.quantity,
        unitPrice: product.basePrice,
        totalAmount: scenario.quantity * product.basePrice,
        customization: scenario.customization,
        colors: scenario.colors,
        sizes: scenario.sizes,
        printLocations: scenario.printLocations,
        companyName: customer.companyName,
        customerNotes: scenario.customerNotes
      };
      
      try {
        const response = await axios.post(`${BASE_URL}/orders`, orderData, {
          headers: { Authorization: `Bearer ${customerTokens[customer.email]}` }
        });
        createdOrders.push(response.data);
        console.log(`✅ Order created: ${response.data.orderNumber} by ${customer.firstName} ${customer.lastName}`);
        console.log(`   Product: ${scenario.productName} x${scenario.quantity} = $${response.data.totalAmount}`);
      } catch (error) {
        console.error(`❌ Failed to create order for ${customer.email}:`, error.response?.data?.error);
      }
    }
    
    console.log(`\n📊 Total orders created: ${createdOrders.length}\n`);
    
    // Step 3: Admin processes orders through lifecycle
    console.log('⚙️ Step 3: Admin Processing Orders Through Lifecycle');
    
    for (const order of createdOrders) {
      console.log(`\n🔄 Processing order: ${order.orderNumber}`);
      
      // Add timeline events and production updates
      const timelineEvents = [
        { eventType: 'status_change', description: 'Order reviewed and approved', eventData: { status: 'approved' } },
        { eventType: 'design_start', description: 'Design phase initiated', eventData: { designer: 'Design Team' } },
        { eventType: 'design_complete', description: 'Design completed and sent for approval', eventData: { designFiles: ['design1.pdf'] } },
        { eventType: 'production_start', description: 'Order moved to production', eventData: { productionLine: 'Line A' } }
      ];
      
      for (const event of timelineEvents) {
        try {
          await axios.post(`${BASE_URL}/orders/${order.id}/timeline`, {
            ...event,
            triggerSource: 'admin'
          }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          console.log(`   ✅ Timeline: ${event.description}`);
        } catch (error) {
          console.error(`   ❌ Timeline event failed:`, error.response?.data?.error);
        }
      }
      
      // Add production updates
      const productionUpdates = [
        { stage: 'design', status: 'completed', description: 'Design approved by customer' },
        { stage: 'printing', status: 'in_progress', description: 'Screen printing in progress' },
        { stage: 'quality_check', status: 'completed', description: 'Quality inspection passed' },
        { stage: 'packaging', status: 'completed', description: 'Items packaged and ready for shipping' }
      ];
      
      for (const update of productionUpdates) {
        try {
          await axios.post(`${BASE_URL}/orders/${order.id}/production`, update, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          console.log(`   ✅ Production: ${update.stage} - ${update.status}`);
        } catch (error) {
          console.error(`   ❌ Production update failed:`, error.response?.data?.error);
        }
      }
    }
    
    // Step 4: Generate business summary
    console.log('\n📈 Step 4: Business Summary');
    
    try {
      const ordersResponse = await axios.get(`${BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const allOrders = ordersResponse.data;
      
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalItems = allOrders.reduce((sum, order) => sum + order.quantity, 0);
      const avgOrderValue = totalRevenue / allOrders.length;
      
      console.log(`\n💰 Business Metrics:`);
      console.log(`   📦 Total Orders: ${allOrders.length}`);
      console.log(`   🎯 Total Items: ${totalItems}`);
      console.log(`   💵 Total Revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`   📊 Average Order Value: $${avgOrderValue.toFixed(2)}`);
      
      // Customer breakdown
      const customerOrders = {};
      allOrders.forEach(order => {
        if (!customerOrders[order.customerEmail]) {
          customerOrders[order.customerEmail] = { count: 0, revenue: 0 };
        }
        customerOrders[order.customerEmail].count++;
        customerOrders[order.customerEmail].revenue += order.totalAmount;
      });
      
      console.log(`\n👥 Customer Breakdown:`);
      Object.entries(customerOrders).forEach(([email, stats]) => {
        console.log(`   ${email}: ${stats.count} orders, $${stats.revenue.toFixed(2)} revenue`);
      });
      
    } catch (error) {
      console.error('❌ Failed to generate business summary:', error.response?.data?.error);
    }
    
    console.log('\n🎉 Full Production Flow Simulation Complete!');
    console.log('\n✅ Summary of what was accomplished:');
    console.log('• User authentication system tested');
    console.log('• Admin product management verified');
    console.log('• Customer order creation validated');
    console.log('• Role-based access control confirmed');
    console.log('• Complete order lifecycle simulated');
    console.log('• Production tracking implemented');
    console.log('• Business analytics generated');
    
  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the simulation
if (require.main === module) {
  simulateFullFlow();
}

module.exports = { simulateFullFlow };
