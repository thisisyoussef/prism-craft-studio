// Test script to verify webhook configuration
// Run with: node test-webhook.js

const https = require('https');

const webhookUrl = 'https://pymmnpuzgotcelpluwqx.supabase.co/functions/v1/stripe-webhook';

console.log('Testing webhook endpoint...');

const testData = JSON.stringify({
  id: 'evt_test',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_test',
      metadata: {
        orderId: 'test-order',
        phase: 'deposit'
      }
    }
  }
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length,
    'stripe-signature': 'test-signature'
  }
};

const req = https.request(webhookUrl, options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(testData);
req.end();
