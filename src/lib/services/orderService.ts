// Order Service - Complete order management system
import { supabase } from '../supabase';
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
  // Create a new order
  static async createOrder(orderData: CreateOrderPayload): Promise<Order> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Calculate deposit and balance amounts (40/60 split)
    const depositAmount = Math.round(orderData.total_amount * 0.4 * 100) / 100;
    const balanceAmount = orderData.total_amount - depositAmount;

    // Create the order
    const orderInsert: any = {
      user_id: user.id,
      product_id: orderData.product_id,
      product_name: orderData.product_name,
      product_category: orderData.product_category,
      quantity: orderData.quantity,
      unit_price: orderData.unit_price,
      total_amount: orderData.total_amount,
      deposit_amount: depositAmount,
      balance_amount: balanceAmount,
      customization: orderData.customization as any,
      colors: orderData.colors,
      sizes: orderData.sizes as any,
      print_locations: orderData.print_locations as any,
      artwork_files: orderData.artwork_files as any,
      customer_notes: orderData.customer_notes,
      shipping_address: orderData.shipping_address as any,
      status: orderData.status || 'deposit_pending',
      order_number: `ORD-${Date.now()}` // Temporary until trigger generates it
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create order');

    // Initialize payment records
    await this.initializePayment(data.id, depositAmount, balanceAmount);

    // Timeline events are handled by database triggers
    // No need to manually create timeline events

    return transformOrderRow(data);
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
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return transformOrderRow(data);
  }

  // Get all orders (with optional filtering)
  static async getOrders(filters?: {
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(transformOrderRow);
  }

  // Get orders for current user
  static async getUserOrders(): Promise<Order[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformOrderRow);
  }

  // Update order
  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    // Transform Order type to database row format
    const dbUpdates: any = { ...updates };
    if (updates.customization) {
      dbUpdates.customization = updates.customization as any;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(dbUpdates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update order');

    return transformOrderRow(data);
  }

  // Get payments for an order
  static async getPayments(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformPaymentRow);
  }

  // Create production update
  static async createProductionUpdate(update: CreateProductionUpdatePayload): Promise<ProductionUpdate> {
    const { data, error } = await supabase
      .from('production_updates')
      .insert(update)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create production update');

    return data;
  }

  // Get production updates for an order
  static async getProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    const { data, error } = await supabase
      .from('production_updates')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformProductionUpdateRow);
  }

  // Get timeline events for an order
  static async getTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformTimelineRow);
  }

  // Subscribe to order updates
  static subscribeToOrderUpdates(orderId: string, callback: (order: any) => void) {
    return supabase
      .channel(`order_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const order = transformOrderRow(payload.new);
          callback(order);
        }
      )
      .subscribe();
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
    const { data: { user } } = await supabase.auth.getUser();
    
    const eventPayload: any = {
      order_id: orderId,
      event_type: eventType,
      description,
      event_data: eventData as any,
      trigger_source: triggerSource,
      triggered_by: user?.id
    };

    const { data, error } = await supabase
      .from('order_timeline')
      .insert(eventPayload)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create timeline event');

    return transformTimelineRow(data);
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
