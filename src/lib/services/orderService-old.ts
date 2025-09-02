// Order Service - Complete order management system
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { 
  Order, 
  CreateOrderPayload, 
  UpdateOrderPayload, 
  Payment, 
  CreatePaymentPayload,
  ProductionUpdate,
  CreateProductionUpdatePayload,
  OrderTimelineEvent,
  OrderStatus
} from '@/lib/types/order';

// Database types from Supabase
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];
type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type ProductionUpdateRow = Database['public']['Tables']['production_updates']['Row'];
type ProductionUpdateInsert = Database['public']['Tables']['production_updates']['Insert'];
type OrderTimelineRow = Database['public']['Tables']['order_timeline']['Row'];
type OrderTimelineInsert = Database['public']['Tables']['order_timeline']['Insert'];

// Helper function to transform database row to Order type
function transformOrderRow(row: OrderRow): Order {
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
function transformPaymentRow(row: PaymentRow): Payment {
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
function transformProductionUpdateRow(row: ProductionUpdateRow): ProductionUpdate {
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
function transformOrderTimelineRow(row: OrderTimelineRow): OrderTimelineEvent {
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
  static async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Calculate deposit and balance amounts (40/60 split)
    const depositAmount = Math.round(payload.total_amount * 0.4 * 100) / 100;
    const balanceAmount = payload.total_amount - depositAmount;

    // Create the order
    const orderData: OrderInsert = {
      user_id: user.id,
      product_id: payload.product_id,
      product_name: payload.product_name,
      product_category: payload.product_category,
      quantity: payload.quantity,
      unit_price: payload.unit_price,
      total_amount: payload.total_amount,
      deposit_amount: depositAmount,
      balance_amount: balanceAmount,
      customization: payload.customization as any,
      colors: payload.colors,
      sizes: payload.sizes as any,
      print_locations: payload.print_locations as any,
      artwork_files: payload.artwork_files as any,
      customer_notes: payload.customer_notes,
      shipping_address: payload.shipping_address as any,
      status: payload.status || 'quote_requested',
      order_number: `ORD-${Date.now()}` // Temporary until trigger generates it
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create order');

    // Initialize payment records
    await this.initializePayments(data.id, depositAmount, balanceAmount);

    return transformOrderRow(data);
  }

  // Initialize payment records for an order
  static async initializePayments(orderId: string, depositAmount: number, balanceAmount: number): Promise<void> {
    const payments: PaymentInsert[] = [
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
  static async updateOrder(orderId: string, updates: UpdateOrderPayload): Promise<Order> {
    const updateData: OrderUpdate = {
      updated_at: new Date().toISOString(),
      status: updates.status,
      priority: updates.priority,
      labels: updates.labels,
      production_notes: updates.production_notes,
      admin_notes: updates.admin_notes,
      tracking_number: updates.tracking_number,
      estimated_delivery: updates.estimated_delivery,
      actual_delivery: updates.actual_delivery
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update order');

    return transformOrderRow(data);
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: OrderStatus, adminNotes?: string): Promise<Order> {
    const updateData: UpdateOrderPayload = { status };
    if (adminNotes) updateData.admin_notes = adminNotes;

    return this.updateOrder(orderId, updateData);
  }

  // Get payments for an order
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
  static async updatePayment(paymentId: string, updates: Partial<PaymentRow>): Promise<Payment> {
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

  // Get production updates for an order
  static async getOrderProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    const { data, error } = await supabase
      .from('production_updates')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformProductionUpdateRow);
  }

  // Create production update
  static async createProductionUpdate(payload: CreateProductionUpdatePayload): Promise<ProductionUpdate> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const updateData: ProductionUpdateInsert = {
      order_id: payload.order_id,
      stage: payload.stage,
      status: payload.status,
      title: payload.title,
      description: payload.description,
      photos: payload.photos as any,
      documents: payload.documents as any,
      estimated_completion: payload.estimated_completion,
      actual_completion: payload.actual_completion,
      created_by: user?.id,
      visible_to_customer: payload.visible_to_customer ?? true
    };

    const { data, error } = await supabase
      .from('production_updates')
      .insert(updateData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create production update');

    return transformProductionUpdateRow(data);
  }

  // Get order timeline events
  static async getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformOrderTimelineRow);
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
    
    const eventPayload: OrderTimelineInsert = {
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

    return transformOrderTimelineRow(data);
  }

  // Subscribe to real-time order updates
  static subscribeToOrder(orderId: string, callback: (order: Order) => void) {
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
            callback(transformOrderRow(payload.new as OrderRow));
          }
        }
      )
      .subscribe();
  }

  // Subscribe to real-time production updates
  static subscribeToProductionUpdates(orderId: string, callback: (update: ProductionUpdate) => void) {
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
            callback(transformProductionUpdateRow(payload.new as ProductionUpdateRow));
          }
        }
      )
      .subscribe();
  }

  // Subscribe to real-time payment updates
  static subscribeToPayments(orderId: string, callback: (payment: Payment) => void) {
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

  // Get payments for an order
  static async getOrderPayments(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Payment[];
  }

  // Create payment record
  static async createPayment(payload: CreatePaymentPayload): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        ...payload,
        currency: payload.currency || 'usd'
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  }

  // Update payment status
  static async updatePaymentStatus(
    paymentId: string, 
    status: Payment['status'], 
    stripeData?: {
      payment_intent_id?: string;
      checkout_session_id?: string;
      charge_id?: string;
    }
  ): Promise<Payment> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'succeeded') {
      updateData.paid_at = new Date().toISOString();
    }

    if (stripeData) {
      if (stripeData.payment_intent_id) updateData.stripe_payment_intent_id = stripeData.payment_intent_id;
      if (stripeData.checkout_session_id) updateData.stripe_checkout_session_id = stripeData.checkout_session_id;
      if (stripeData.charge_id) updateData.stripe_charge_id = stripeData.charge_id;
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  }

  // Get production updates for an order
  static async getProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    const { data, error } = await supabase
      .from('production_updates')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ProductionUpdate[];
  }

  // Create production update
  static async createProductionUpdate(payload: CreateProductionUpdatePayload): Promise<ProductionUpdate> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('production_updates')
      .insert([{
        ...payload,
        created_by: user?.id,
        visible_to_customer: payload.visible_to_customer ?? true
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ProductionUpdate;
  }

  // Get order timeline
  static async getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as OrderTimelineEvent[];
  }

  // Add timeline event
  static async addTimelineEvent(
    orderId: string,
    eventType: string,
    description: string,
    eventData: Record<string, any> = {},
    triggerSource: 'manual' | 'system' | 'webhook' | 'api' = 'manual'
  ): Promise<OrderTimelineEvent> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('order_timeline')
      .insert([{
        order_id: orderId,
        event_type: eventType,
        event_data: eventData,
        description,
        triggered_by: user?.id,
        trigger_source: triggerSource
      }])
      .select()
      .single();

    if (error) throw error;
    return data as OrderTimelineEvent;
  }

  // Admin methods
  static async getAllOrders(
    filters: {
      status?: OrderStatus;
      priority?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    } = {},
    limit = 50,
    offset = 0
  ): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.search) {
      query = query.or(`order_number.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,customer_notes.ilike.%${filters.search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Order[];
  }

  // Get order statistics
  static async getOrderStats(): Promise<{
    total: number;
    byStatus: Record<OrderStatus, number>;
    totalRevenue: number;
    pendingRevenue: number;
  }> {
    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount');

    if (error) throw error;

    const stats = {
      total: data.length,
      byStatus: {} as Record<OrderStatus, number>,
      totalRevenue: 0,
      pendingRevenue: 0
    };

    // Initialize status counts
    const statuses: OrderStatus[] = [
      'draft', 'quote_requested', 'quoted', 'deposit_pending', 'deposit_paid',
      'in_production', 'quality_check', 'balance_pending', 'balance_paid',
      'ready_to_ship', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
    ];
    
    statuses.forEach(status => {
      stats.byStatus[status] = 0;
    });

    // Calculate stats
    data.forEach(order => {
      const status = order.status as OrderStatus;
      stats.byStatus[status]++;
      
      if (['completed', 'delivered'].includes(status)) {
        stats.totalRevenue += order.total_amount;
      } else if (!['cancelled', 'refunded'].includes(status)) {
        stats.pendingRevenue += order.total_amount;
      }
    });

    return stats;
  }

  // Subscribe to order changes
  static subscribeToOrder(orderId: string, callback: (order: Order) => void) {
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
            callback(payload.new as Order);
          }
        }
      )
      .subscribe();
  }

  // Subscribe to production updates
  static subscribeToProductionUpdates(orderId: string, callback: (update: ProductionUpdate) => void) {
    return supabase
      .channel(`production-updates-${orderId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'production_updates',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          if (payload.new) {
            callback(payload.new as ProductionUpdate);
          }
        }
      )
      .subscribe();
  }
}
