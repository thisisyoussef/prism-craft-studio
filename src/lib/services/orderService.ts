// Order Service - Complete order management system
import { orderApi } from './orderApi';
import { subscribe } from '../socket';
import type { 
  Order, 
  OrderStatus, 
  CreateOrderPayload, 
  CreateProductionUpdatePayload, 
  ProductionUpdate, 
  OrderTimelineEvent, 
  Payment, 
  PaymentPhase, 
  PaymentStatus
} from '../types/order';

// Helper function to transform database row to Order type
function transformOrderRow(row: any): Order {
  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    company_id: row.company_id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_category: row.product_category,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total_amount: row.total_amount,
    customization: row.customization as any || {},
    colors: row.colors || [],
    sizes: row.sizes as any || {},
    print_locations: row.print_locations as any || [],
    status: row.status as OrderStatus,
    priority: (row.priority as any) || 'normal',
    labels: row.labels || [],
    deposit_amount: row.deposit_amount,
    balance_amount: row.balance_amount,
    deposit_paid_at: row.deposit_paid_at,
    balance_paid_at: row.balance_paid_at,
    shipping_address: row.shipping_address as any,
    tracking_number: row.tracking_number,
    estimated_delivery: row.estimated_delivery,
    actual_delivery: row.actual_delivery,
    artwork_files: (row.artwork_files as string[]) || [],
    production_notes: row.production_notes,
    customer_notes: row.customer_notes,
    admin_notes: row.admin_notes,
    stripe_deposit_payment_intent: row.stripe_deposit_payment_intent,
    stripe_balance_payment_intent: row.stripe_balance_payment_intent,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Helper function to transform database row to Payment type
function transformPaymentRow(row: any): Payment {
  return {
    id: row.id,
    order_id: row.order_id,
    phase: row.phase as any,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status as any,
    stripe_payment_intent_id: row.stripe_payment_intent_id,
    stripe_checkout_session_id: row.stripe_checkout_session_id,
    stripe_charge_id: row.stripe_charge_id,
    paid_at: row.paid_at,
    metadata: row.metadata as any,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Helper function to transform database row to ProductionUpdate type
function transformProductionUpdateRow(row: any): ProductionUpdate {
  return {
    id: row.id,
    order_id: row.order_id,
    stage: row.stage as any,
    status: row.status as any,
    title: `${row.stage} Update`,
    description: row.description,
    photos: (row.photos as string[]) || [],
    documents: (row.documents as string[]) || [],
    estimated_completion: row.estimated_completion,
    actual_completion: row.actual_completion,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    visible_to_customer: true
  };
}

// Helper function to transform database row to OrderTimelineEvent type
function transformTimelineRow(row: any): OrderTimelineEvent {
  return {
    id: row.id,
    order_id: row.order_id,
    event_type: row.event_type as any,
    description: row.description,
    event_data: row.event_data as any,
    trigger_source: row.trigger_source as any,
    triggered_by: row.triggered_by,
    created_at: row.created_at
  };
}

export class OrderService {
  static async createOrder(orderData: CreateOrderPayload): Promise<Order> {
    return orderApi.create(orderData);
  }

  // Initialize payment records for an order
  static async initializePayment(orderId: string, depositAmount: number, balanceAmount: number): Promise<void> {
    const payments: any[] = [
      {
        order_id: orderId,
        phase: 'deposit',
        amount_cents: Math.round(depositAmount * 100),
        currency: 'usd',
        status: 'pending'
      },
      {
        order_id: orderId,
        phase: 'balance',
        amount_cents: Math.round(balanceAmount * 100),
        currency: 'usd',
        status: 'pending'
      }
    ];

    const { error } = await supabase
      .from('payments')
      .insert(payments);

    if (error) throw error;
  }

  // Get order by ID
  static async getOrder(orderId: string): Promise<Order | null> {
    try {
      return await orderApi.get(orderId);
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  // Get all orders (with optional filtering)
  static async getOrders(filters?: {
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    return orderApi.list(filters);
  }

  // Get orders for current user
  static async getUserOrders(): Promise<Order[]> {
    return orderApi.list({ userId: 'me' });
  }

  // Update order
  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    return orderApi.update(orderId, updates as UpdateOrderPayload);
  }

  // Get payments for an order
  static async getPayments(orderId: string): Promise<Payment[]> {
    return orderApi.payments(orderId);
  }

  // Create production update
  static async createProductionUpdate(update: CreateProductionUpdatePayload): Promise<ProductionUpdate> {
    return orderApi.createProductionUpdate(update.order_id, update as any);
  }

  // Get production updates for an order
  static async getProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    return orderApi.productionUpdates(orderId);
  }

  // Get timeline events for an order
  static async getTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    return orderApi.timeline(orderId);
  }

  // Subscribe to order updates
  static subscribeToOrderUpdates(orderId: string, callback: (order: any) => void) {
    return subscribe(`order:${orderId}`, 'order.updated', callback);
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: OrderStatus, adminNotes?: string): Promise<Order> {
    const updateData: any = { status };
    if (adminNotes) updateData.admin_notes = adminNotes;

    return this.updateOrder(orderId, updateData);
  }

  // Get payments for an order (alias for getPayments)
  static async getOrderPayments(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformPaymentRow);
  }

  // Update payment status
  static async updatePayment(paymentId: string, updates: any): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update payment');

    return transformPaymentRow(data);
  }

  // Get production updates for an order (alias for getProductionUpdates)
  static async getOrderProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    const { data, error } = await supabase
      .from('production_updates')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformProductionUpdateRow);
  }

  // Get order timeline events (alias for getTimeline)
  static async getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformTimelineRow);
  }

  // Create timeline event
  static async createTimelineEvent(
    orderId: string,
    eventType: string,
    description: string,
    eventData: Record<string, any> = {},
    triggerSource: 'manual' | 'system' | 'webhook' | 'api' = 'manual'
  ): Promise<OrderTimelineEvent> {
    return orderApi.createTimeline(orderId, { eventType, description, eventData, triggerSource });
  }

  // Subscribe to real-time order updates (alias for subscribeToOrderUpdates)
  static subscribeToOrder(orderId: string, callback: (order: any) => void) {
    return supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${orderId}`
        }, 
        (payload) => {
          if (payload.new) {
            callback(transformOrderRow(payload.new as any));
          }
        }
      )
      .subscribe();
  }

  // Subscribe to real-time production updates
  static subscribeToProductionUpdates(orderId: string, callback: (update: any) => void) {
    return supabase
      .channel(`production-${orderId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'production_updates',
          filter: `order_id=eq.${orderId}`
        }, 
        (payload) => {
          if (payload.new) {
            callback(transformProductionUpdateRow(payload.new as any));
          }
        }
      )
      .subscribe();
  }

  // Subscribe to real-time payment updates
  static subscribeToPaymentUpdates(orderId: string, callback: (payment: any) => void) {
    return supabase
      .channel(`payments-${orderId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'payments',
          filter: `order_id=eq.${orderId}`
        }, 
        (payload) => {
          if (payload.new) {
            callback(transformPaymentRow(payload.new as PaymentRow));
          }
        }
      )
      .subscribe();
  }
}
