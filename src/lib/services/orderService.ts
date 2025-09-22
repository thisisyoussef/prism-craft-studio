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

function mapOrder(api: any): Order {
  return {
    id: api.id,
    order_number: api.orderNumber,
    user_id: api.userId || '',
    company_id: api.companyId,
    product_id: api.productId,
    product_name: api.productName,
    product_category: api.productCategory,
    quantity: api.quantity,
    unit_price: api.unitPrice,
    total_amount: api.totalAmount,
    customization: (api.customization as any) || {},
    colors: api.colors || [],
    sizes: (api.sizes as any) || {},
    print_locations: (api.printLocations as any) || [],
    status: api.status,
    priority: (api.priority as any) || 'normal',
    labels: api.labels || [],
    deposit_amount: api.depositAmount,
    balance_amount: api.balanceAmount,
    deposit_paid_at: api.depositPaidAt || undefined,
    balance_paid_at: api.balancePaidAt || undefined,
    shipping_address: (api.shippingAddress as any) || undefined,
    tracking_number: api.trackingNumber || undefined,
    estimated_delivery: api.estimatedDelivery || undefined,
    actual_delivery: api.actualDelivery || undefined,
    artwork_files: api.artworkFiles || [],
    production_notes: api.productionNotes || undefined,
    customer_notes: api.customerNotes || undefined,
    admin_notes: api.adminNotes || undefined,
    stripe_deposit_payment_intent: api.stripeDepositPaymentIntent || undefined,
    stripe_balance_payment_intent: api.stripeBalancePaymentIntent || undefined,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  };
}

function mapPayment(api: any): Payment {
  return {
    id: api.id,
    order_id: (typeof api.orderId === 'string' ? api.orderId : api.orderId?.toString?.()) || '',
    phase: api.phase,
    amount_cents: api.amountCents,
    currency: api.currency,
    status: api.status,
    stripe_payment_intent_id: api.stripePaymentIntentId || undefined,
    stripe_checkout_session_id: api.stripeCheckoutSessionId || undefined,
    stripe_charge_id: api.stripeChargeId || undefined,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
    paid_at: api.paidAt || undefined,
    metadata: api.metadata || {},
  };
}

function mapProductionUpdate(api: any): ProductionUpdate {
  return {
    id: api.id,
    order_id: (typeof api.orderId === 'string' ? api.orderId : api.orderId?.toString?.()) || '',
    stage: api.stage,
    status: api.status,
    title: api.title || `${api.stage} Update`,
    description: api.description || undefined,
    photos: api.photos || [],
    documents: api.documents || [],
    estimated_completion: api.estimatedCompletion || undefined,
    actual_completion: api.actualCompletion || undefined,
    created_by: api.createdBy || undefined,
    visible_to_customer: api.visibleToCustomer ?? true,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  };
}

function mapTimelineEvent(api: any): OrderTimelineEvent {
  return {
    id: api.id,
    order_id: (typeof api.orderId === 'string' ? api.orderId : api.orderId?.toString?.()) || '',
    event_type: api.eventType,
    description: api.description,
    event_data: api.eventData || {},
    trigger_source: api.triggerSource || 'manual',
    triggered_by: api.triggeredBy || undefined,
    created_at: api.createdAt,
  };
}

export class OrderService {
  static async createOrder(orderData: CreateOrderPayload): Promise<Order> {
    const api = await orderApi.create(orderData);
    return mapOrder(api);
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
      const api = await orderApi.get(orderId);
      return mapOrder(api);
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
    const list = await orderApi.list(filters);
    return list.map(mapOrder);
  }

  // Get orders for current user
  static async getUserOrders(): Promise<Order[]> {
    const list = await orderApi.list({ userId: 'me' });
    return list.map(mapOrder);
  }

  // Update order
  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    const api = await orderApi.update(orderId, updates as UpdateOrderPayload);
    return mapOrder(api);
  }

  // Get payments for an order
  static async getPayments(orderId: string): Promise<Payment[]> {
    const list = await orderApi.payments(orderId);
    return list.map(mapPayment);
  }

  // Create production update
  static async createProductionUpdate(update: CreateProductionUpdatePayload): Promise<ProductionUpdate> {
    const api = await orderApi.createProductionUpdate(update.order_id, update as any);
    return mapProductionUpdate(api);
  }

  // Get production updates for an order
  static async getProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    const list = await orderApi.productionUpdates(orderId);
    return list.map(mapProductionUpdate);
  }

  // Get timeline events for an order
  static async getTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    const list = await orderApi.timeline(orderId);
    return list.map(mapTimelineEvent);
  }

  // Subscribe to order updates
  static subscribeToOrderUpdates(orderId: string, callback: (order: any) => void) {
    return subscribe(`order:${orderId}`, 'order.updated', (payload: any) => callback(mapOrder(payload)));
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
    const api = await orderApi.createTimeline(orderId, { eventType, description, eventData, triggerSource });
    return mapTimelineEvent(api);
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
