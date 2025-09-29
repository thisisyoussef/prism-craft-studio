const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testAPI() {
  console.log('🧪 Starting API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('📊 Status:', healthResponse.status);
    console.log('');

    // Test 2: Create Order
    console.log('2️⃣ Testing Order Creation...');
    const orderData = {
      productCategory: 'apparel',
      productName: 'Custom T-Shirt',
      quantity: 50,
      unitPrice: 15.99,
      totalAmount: 799.50,
      customization: {
        design: 'Logo on front',
        colors: ['black', 'white']
      },
      colors: ['black', 'white'],
      sizes: { S: 10, M: 20, L: 15, XL: 5 },
      printLocations: ['front']
    };

    const createOrderResponse = await axios.post(`${BASE_URL}/api/orders`, orderData);
    console.log('✅ Order Created:', createOrderResponse.data);
    console.log('📊 Status:', createOrderResponse.status);
    
    const orderId = createOrderResponse.data.id;
    console.log('🆔 Order ID:', orderId);
    console.log('');

    // Test 3: Get Order
    console.log('3️⃣ Testing Get Order...');
    const getOrderResponse = await axios.get(`${BASE_URL}/api/orders/${orderId}`);
    console.log('✅ Order Retrieved:', getOrderResponse.data);
    console.log('');

    // Test 4: Get All Orders
    console.log('4️⃣ Testing Get All Orders...');
    const getAllOrdersResponse = await axios.get(`${BASE_URL}/api/orders`);
    console.log('✅ All Orders:', getAllOrdersResponse.data.length, 'orders found');
    console.log('');

    // Test 5: Update Order
    console.log('5️⃣ Testing Order Update...');
    const updateData = {
      status: 'design_review',
      adminNotes: 'Customer approved initial design'
    };
    const updateOrderResponse = await axios.patch(`${BASE_URL}/api/orders/${orderId}`, updateData);
    console.log('✅ Order Updated:', updateOrderResponse.data);
    console.log('');

    // Test 6: Add Timeline Event
    console.log('6️⃣ Testing Timeline Event...');
    const timelineData = {
      eventType: 'status_change',
      description: 'Order moved to design review',
      eventData: { previousStatus: 'deposit_pending', newStatus: 'design_review' },
      triggerSource: 'admin'
    };
    const timelineResponse = await axios.post(`${BASE_URL}/api/orders/${orderId}/timeline`, timelineData);
    console.log('✅ Timeline Event Added:', timelineResponse.data);
    console.log('');

    // Test 7: Get Timeline
    console.log('7️⃣ Testing Get Timeline...');
    const getTimelineResponse = await axios.get(`${BASE_URL}/api/orders/${orderId}/timeline`);
    console.log('✅ Timeline Retrieved:', getTimelineResponse.data);
    console.log('');

    // Test 8: Get Payments
    console.log('8️⃣ Testing Get Payments...');
    const getPaymentsResponse = await axios.get(`${BASE_URL}/api/orders/${orderId}/payments`);
    console.log('✅ Payments Retrieved:', getPaymentsResponse.data);
    console.log('');

    console.log('🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API Test Failed:', error.response?.data || error.message);
    console.error('📊 Status:', error.response?.status);
    console.error('🔍 URL:', error.config?.url);
  }
}

// Run the tests
testAPI();
