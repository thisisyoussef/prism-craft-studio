const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Authentication credentials
const ADMIN_CREDENTIALS = { 
  email: 'admin@prismcraft.com', 
  password: 'admin123456'
};

const CUSTOMER_CREDENTIALS = {
  email: 'john@company.com', 
  password: 'customer123456'
};

let adminToken = '';
let customerToken = '';

async function testSimplifiedWorkflow() {
  console.log('🧪 Testing Simplified Order Workflow\n');
  
  try {
    // Step 1: Authenticate users
    console.log('🔑 Step 1: Authentication');
    
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    adminToken = adminLogin.data.token;
    console.log('✅ Admin authenticated');
    
    const customerLogin = await axios.post(`${BASE_URL}/auth/login`, CUSTOMER_CREDENTIALS);
    customerToken = customerLogin.data.token;
    console.log('✅ Customer authenticated\n');
    
    // Step 2: Customer creates order (status: submitted)
    console.log('📝 Step 2: Customer Creates Order');
    
    // Create order with product amount only
    const productAmount = 399.50; // 50 * 7.99
    const orderResponse = await axios.post(`${BASE_URL}/orders`, {
      productCategory: 'Apparel',
      productName: 'Custom T-Shirt',
      quantity: 50,
      unitPrice: 7.99,
      totalAmount: productAmount,
      customization: {
        design: 'Company Logo',
        colors: ['Navy', 'White'],
        printLocation: 'Front'
      },
      colors: ['Navy', 'White'],
      sizes: { S: 10, M: 20, L: 15, XL: 5 },
      printLocations: ['Front'],
      companyName: 'Test Company',
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA'
      }
    }, { headers: { Authorization: `Bearer ${customerToken}` } });

    const order = orderResponse.data;
    console.log(`✅ Order created: ${order.orderNumber} (Status: ${order.status})`);
    console.log(`💰 Total amount: $${order.totalAmount} (product only)`);

    // Verify order has correct total (product amount only)
    if (Math.abs(order.totalAmount - productAmount) > 0.01) {
      throw new Error(`Expected total $${productAmount}, got $${order.totalAmount}`);
    }
    
    const orderId = order.id;
    console.log(`   Order ID: ${orderId}\n`);
    
    // Step 3: Customer completes payment (status: submitted → paid)
    console.log('💳 Step 3: Customer Completes Payment');
    
    const paymentResponse = await axios.patch(`${BASE_URL}/orders/${orderId}/payment`, {}, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    
    console.log(`✅ Payment completed`);
    console.log(`   Status: ${paymentResponse.data.status}`);
    console.log(`   Paid Amount: $${paymentResponse.data.totalPaidAmount}`);
    console.log(`   Paid At: ${paymentResponse.data.paidAt}\n`);
    
    // Step 4: Admin moves to production (status: paid → in_production)
    console.log('🏭 Step 4: Admin Moves Order to Production');
    
    const productionResponse = await axios.patch(`${BASE_URL}/orders/${orderId}/status`, {
      status: 'in_production'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`✅ Order moved to production`);
    console.log(`   Status: ${productionResponse.data.status}\n`);
    
    // Step 5: Admin marks as shipping (status: in_production → shipping)
    // This should auto-charge shipping fee
    console.log('🚚 Step 5: Admin Marks Order as Shipping');
    
    const shippingResponse = await axios.patch(`${BASE_URL}/orders/${orderId}/status`, {
      status: 'shipping',
      trackingNumber: 'TRK123456789',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const shippingOrder = shippingResponse.data;
    console.log(`✅ Order marked as shipping`);
    console.log(`   Status: ${shippingOrder.status}`);
    console.log(`   Tracking: ${shippingOrder.trackingNumber}`);
    console.log(`   Estimated Delivery: ${shippingOrder.estimatedDelivery}\n`);
    
    // Step 6: Admin marks as delivered (status: shipping → delivered)
    console.log('📦 Step 6: Admin Marks Order as Delivered');
    
    const deliveredResponse = await axios.patch(`${BASE_URL}/orders/${orderId}/status`, {
      status: 'delivered'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`✅ Order marked as delivered`);
    console.log(`   Status: ${deliveredResponse.data.status}`);
    console.log(`   Delivered At: ${deliveredResponse.data.actualDelivery}\n`);
    
    // Step 7: Verify complete order details
    console.log('🔍 Step 7: Final Order Verification');
    
    const finalOrder = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('📊 Final Order Summary:');
    console.log(`   Order Number: ${finalOrder.data.orderNumber}`);
    console.log(`   Status: ${finalOrder.data.status}`);
    console.log(`   Product Total: $${finalOrder.data.totalAmount}`);
    console.log(`   Amount Paid: $${finalOrder.data.totalPaidAmount}`);
    console.log(`   Total Revenue: $${finalOrder.data.totalPaidAmount}`);
    console.log(`   Created: ${new Date(finalOrder.data.createdAt).toLocaleDateString()}`);
    console.log(`   Paid: ${finalOrder.data.paidAt ? new Date(finalOrder.data.paidAt).toLocaleDateString() : 'Not paid'}`);
    console.log(`   Delivered: ${finalOrder.data.actualDelivery ? new Date(finalOrder.data.actualDelivery).toLocaleDateString() : 'Not delivered'}\n`);
    
    // Step 8: Check payments
    console.log('\n💰 Step 8: Payment Verification');
    
    const payments = await axios.get(`${BASE_URL}/orders/${orderId}/payment`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('Payment Records:');
    payments.data.forEach(payment => {
      console.log(`   Payment: $${(payment.amountCents / 100).toFixed(2)} - ${payment.status}`);
      if (payment.paidAt) {
        console.log(`     Paid: ${new Date(payment.paidAt).toLocaleDateString()}`);
      }
    });
    
    console.log('\n🎉 Simplified Workflow Test Complete!');
    console.log('\n✅ Workflow Summary:');
    console.log('1. submitted → Customer creates order with design');
    console.log('2. paid → Customer pays full amount upfront');
    console.log('3. in_production → Admin moves to production');
    console.log('4. shipping → Admin ships order');
    console.log('5. delivered → Admin marks as delivered');
    console.log('\n🚀 All steps completed successfully!');
    
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
  testSimplifiedWorkflow();
}

module.exports = { testSimplifiedWorkflow };
