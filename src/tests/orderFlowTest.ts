// End-to-End Order Flow Test
// This script tests the complete order flow from creation to completion

import { OrderService } from '@/lib/services/orderService';
import { supabase } from '@/integrations/supabase/client';
import type { CreateOrderPayload, OrderStatus } from '@/lib/types/order';

interface TestResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

class OrderFlowTester {
  private results: TestResult[] = [];
  private testOrderId: string | null = null;
  private orderService = new OrderService();

  async runCompleteTest(): Promise<TestResult[]> {
    console.log('🚀 Starting End-to-End Order Flow Test...\n');
    
    try {
      // Step 1: Test Order Creation
      await this.testOrderCreation();
      
      // Step 2: Test Payment Initialization
      await this.testPaymentInitialization();
      
      // Step 3: Test Order Status Updates
      await this.testOrderStatusUpdates();
      
      // Step 4: Test Production Updates
      await this.testProductionUpdates();
      
      // Step 5: Test Timeline Events
      await this.testTimelineEvents();
      
      // Step 6: Test Real-time Subscriptions
      await this.testRealtimeSubscriptions();
      
      // Step 7: Cleanup Test Data
      await this.cleanupTestData();
      
    } catch (error) {
      this.addResult('Complete Test', false, `Test suite failed: ${error}`);
    }
    
    this.printResults();
    return this.results;
  }

  private async testOrderCreation(): Promise<void> {
    try {
      console.log('📦 Testing Order Creation...');
      
      const testOrder: CreateOrderPayload = {
        customization: {
          product_type: 'hoodie',
          size_distribution: { 'M': 2, 'L': 3 },
          print_locations: [{
            id: 'front-1',
            location: 'front',
            method: 'screen-print',
            colors: ['#000000'],
            colorCount: 1,
            size: { widthIn: 10, heightIn: 12 }
          }]
        },
        quantity: 5,
        total_amount: 150.00,
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip: '12345',
          country: 'US'
        },
        artwork_files: ['test-artwork.png'],
        notes: 'Test order for end-to-end flow validation'
      };

      const order = await this.orderService.createOrder(testOrder);
      this.testOrderId = order.id;
      
      // Verify order was created with correct structure
      if (order.id && order.order_number && order.deposit_amount && order.balance_amount) {
        this.addResult('Order Creation', true, undefined, {
          orderId: order.id,
          orderNumber: order.order_number,
          depositAmount: order.deposit_amount,
          balanceAmount: order.balance_amount
        });
      } else {
        this.addResult('Order Creation', false, 'Order missing required fields');
      }
      
    } catch (error) {
      this.addResult('Order Creation', false, `${error}`);
    }
  }

  private async testPaymentInitialization(): Promise<void> {
    if (!this.testOrderId) return;
    
    try {
      console.log('💳 Testing Payment Initialization...');
      
      const payments = await this.orderService.getPayments(this.testOrderId);
      
      // Should have deposit and balance payments initialized
      const depositPayment = payments.find(p => p.phase === 'deposit');
      const balancePayment = payments.find(p => p.phase === 'balance');
      
      if (depositPayment && balancePayment) {
        this.addResult('Payment Initialization', true, undefined, {
          depositAmount: depositPayment.amount_cents,
          balanceAmount: balancePayment.amount_cents,
          totalPayments: payments.length
        });
      } else {
        this.addResult('Payment Initialization', false, 'Missing deposit or balance payment');
      }
      
    } catch (error) {
      this.addResult('Payment Initialization', false, `${error}`);
    }
  }

  private async testOrderStatusUpdates(): Promise<void> {
    if (!this.testOrderId) return;
    
    try {
      console.log('🔄 Testing Order Status Updates...');
      
      const statusesToTest: OrderStatus[] = ['deposit_paid', 'in_production', 'quality_check'];
      
      for (const status of statusesToTest) {
        await this.orderService.updateOrder(this.testOrderId, { status });
        
        // Verify status was updated
        const updatedOrder = await this.orderService.getOrder(this.testOrderId);
        if (updatedOrder.status !== status) {
          throw new Error(`Status update failed for ${status}`);
        }
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.addResult('Order Status Updates', true, undefined, {
        statusesUpdated: statusesToTest.length
      });
      
    } catch (error) {
      this.addResult('Order Status Updates', false, `${error}`);
    }
  }

  private async testProductionUpdates(): Promise<void> {
    if (!this.testOrderId) return;
    
    try {
      console.log('🏭 Testing Production Updates...');
      
      // Create a production update
      await this.orderService.createProductionUpdate({
        order_id: this.testOrderId,
        stage: 'in_production',
        status: 'in_progress',
        description: 'Test production update - order is being processed',
        visible_to_customer: true
      });
      
      // Fetch production updates
      const updates = await this.orderService.getProductionUpdates(this.testOrderId);
      
      if (updates.length > 0) {
        this.addResult('Production Updates', true, undefined, {
          updatesCount: updates.length,
          latestUpdate: updates[0].description
        });
      } else {
        this.addResult('Production Updates', false, 'No production updates found');
      }
      
    } catch (error) {
      this.addResult('Production Updates', false, `${error}`);
    }
  }

  private async testTimelineEvents(): Promise<void> {
    if (!this.testOrderId) return;
    
    try {
      console.log('📅 Testing Timeline Events...');
      
      const timeline = await this.orderService.getTimeline(this.testOrderId);
      
      // Should have events for order creation, status updates, and production updates
      if (timeline.length >= 3) {
        this.addResult('Timeline Events', true, undefined, {
          eventsCount: timeline.length,
          eventTypes: [...new Set(timeline.map(e => e.event_type))]
        });
      } else {
        this.addResult('Timeline Events', false, `Insufficient timeline events: ${timeline.length}`);
      }
      
    } catch (error) {
      this.addResult('Timeline Events', false, `${error}`);
    }
  }

  private async testRealtimeSubscriptions(): Promise<void> {
    if (!this.testOrderId) return;
    
    try {
      console.log('⚡ Testing Real-time Subscriptions...');
      
      // Test subscription setup (doesn't test actual real-time updates in this context)
      const subscription = this.orderService.subscribeToOrderUpdates(this.testOrderId, (order) => {
        console.log('Real-time order update received:', order.status);
      });
      
      // Verify subscription was created
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
        this.addResult('Real-time Subscriptions', true, undefined, {
          subscriptionCreated: true
        });
      } else {
        this.addResult('Real-time Subscriptions', false, 'Failed to create subscription');
      }
      
    } catch (error) {
      this.addResult('Real-time Subscriptions', false, `${error}`);
    }
  }

  private async cleanupTestData(): Promise<void> {
    if (!this.testOrderId) return;
    
    try {
      console.log('🧹 Cleaning up test data...');
      
      // Delete production updates
      await supabase
        .from('production_updates')
        .delete()
        .eq('order_id', this.testOrderId);
      
      // Delete timeline events
      await supabase
        .from('order_timeline')
        .delete()
        .eq('order_id', this.testOrderId);
      
      // Delete payments
      await supabase
        .from('payments')
        .delete()
        .eq('order_id', this.testOrderId);
      
      // Delete order
      await supabase
        .from('orders')
        .delete()
        .eq('id', this.testOrderId);
      
      this.addResult('Cleanup', true, undefined, {
        orderDeleted: this.testOrderId
      });
      
    } catch (error) {
      this.addResult('Cleanup', false, `${error}`);
    }
  }

  private addResult(step: string, success: boolean, error?: string, data?: any): void {
    this.results.push({ step, success, error, data });
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${step}${error ? `: ${error}` : ''}`);
    
    if (data) {
      console.log(`   Data:`, data);
    }
    console.log('');
  }

  private printResults(): void {
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${total - successful}/${total}`);
    console.log(`📈 Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    
    if (successful === total) {
      console.log('\n🎉 ALL TESTS PASSED! Order flow is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the errors above.');
    }
    
    console.log('='.repeat(50) + '\n');
  }
}

// Export for use in development/testing
export async function runOrderFlowTest(): Promise<TestResult[]> {
  const tester = new OrderFlowTester();
  return await tester.runCompleteTest();
}

// Run test if this file is executed directly
if (typeof window !== 'undefined' && (window as any).runOrderFlowTest) {
  (window as any).runOrderFlowTest = runOrderFlowTest;
}
