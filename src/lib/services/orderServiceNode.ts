import api from '@/lib/api';
import type { 
  Order, 
  OrderStatus, 
  CreateOrderPayload, 
  ProductionUpdate,
  OrderTimelineEvent,
} from '@/lib/types/order';

function mapStatusToNode(status?: OrderStatus): 'submitted' | 'paid' | 'in_production' | 'shipping' | 'delivered' {
  return (status as any) || 'submitted';
}

function nodeOrderToApp(o: any): Order {
  let sizesRecord: Record<string, number> = {};
  if (o && typeof o.sizes === 'object' && !Array.isArray(o.sizes)) {
    sizesRecord = Object.fromEntries(Object.entries(o.sizes).map(([k, v]) => [String(k), Number(v) || 0]));
  } else if (Array.isArray(o.sizes)) {
    for (const s of o.sizes) sizesRecord[String(s)] = (sizesRecord[String(s)] || 0) + 1;
  }
  const printLocations = Array.isArray(o.printLocations) ? (o.printLocations || []).map((loc: string, idx: number) => ({
    id: String(idx),
    location: loc as any,
    method: (o.customization?.method || 'screen-print') as any,
    size: { widthIn: 8, heightIn: 10 },
    position: { x: 0, y: 0 },
    active: true,
  })) : [];

  return {
    id: o.id,
    order_number: o.orderNumber,
    user_id: o.customerId || '',
    company_id: undefined,
    product_id: undefined,
    product_name: o.productName,
    product_category: o.productCategory,
    quantity: Number(o.quantity || 0),
    unit_price: Number(o.unitPrice || 0),
    total_amount: Number(o.totalAmount || 0),
    customization: (o.customization || {}) as any,
    colors: Array.isArray(o.colors) ? o.colors : [],
    sizes: sizesRecord,
    print_locations: printLocations as any,
    status: (o.status as OrderStatus) || 'submitted',
    priority: (o.priority || 'normal') as any,
    labels: Array.isArray(o.labels) ? o.labels : [],
    // Back-compat fields (no longer used for UI): treat full payment model
    deposit_amount: Number(o.totalAmount || 0),
    balance_amount: 0,
    deposit_paid_at: o.paidAt ? String(o.paidAt) : undefined,
    balance_paid_at: undefined,
    shipping_fee_cents: typeof o.shippingFeeCents === 'number' ? Number(o.shippingFeeCents) : undefined,
    shipping_paid_at: o.shippingPaidAt ? String(o.shippingPaidAt) : undefined,
    shipping_address: o.shippingAddress || undefined,
    tracking_number: o.trackingNumber || undefined,
    estimated_delivery: o.estimatedDelivery ? String(o.estimatedDelivery) : undefined,
    actual_delivery: o.actualDelivery ? String(o.actualDelivery) : undefined,
    artwork_files: Array.isArray(o.artworkFiles) ? o.artworkFiles : [],
    production_notes: o.productionNotes || undefined,
    customer_notes: o.customerNotes || undefined,
    admin_notes: o.adminNotes || undefined,
    guest_email: o.guestEmail || undefined,
    mockup_images: o.mockupImages || undefined,
    stripe_deposit_payment_intent: undefined,
    stripe_balance_payment_intent: undefined,
    created_at: String(o.createdAt || new Date().toISOString()),
    updated_at: String(o.updatedAt || new Date().toISOString()),
  };
}

function appCreateToNode(p: CreateOrderPayload) {
  const sizesArr: string[] = Object.entries(p.sizes || {})
    .filter(([, qty]) => Number(qty) > 0)
    .flatMap(([size, qty]) => Array(qty).fill(size));
  const printLocations: string[] = (p.print_locations || []).map((pl) => pl.location);
  return {
    productCategory: p.product_category,
    productName: p.product_name,
    quantity: p.quantity,
    unitPrice: p.unit_price,
    totalAmount: p.total_amount,
    customization: p.customization,
    colors: p.colors,
    sizes: sizesArr.length ? sizesArr : Object.keys(p.sizes || {}),
    printLocations,
    shippingAddress: p.shipping_address,
  };
}

export class OrderService {
  static async resendGuestAccessLink(orderId: string): Promise<void> {
    await api.post(`/orders/${orderId}/guest/resend-link`);
  }
  static async markOrderPaid(orderId: string): Promise<Order> {
    const { data } = await api.patch(`/orders/${orderId}/payment`);
    return nodeOrderToApp(data);
  }

  static async attachMockups(orderId: string, images: { front?: string; back?: string; sleeve?: string; composite?: string }): Promise<Order> {
    const { data } = await api.patch(`/orders/${orderId}/mockups`, { mockupImages: images });
    return nodeOrderToApp(data);
  }

  static async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const nodeBody = appCreateToNode(payload);
    const { data } = await api.post('/orders', nodeBody);
    return nodeOrderToApp(data);
  }

  static async getOrder(orderId: string): Promise<Order | null> {
    const { data } = await api.get(`/orders/${orderId}`);
    return nodeOrderToApp(data);
  }

  static async getUserOrders(): Promise<Order[]> {
    const { data } = await api.get('/orders');
    const list = Array.isArray(data) ? data : (data?.orders || data || []);
    return list.map(nodeOrderToApp);
  }

  // Admin: get all orders (server returns all orders for admin users)
  static async getOrders(): Promise<Order[]> {
    const { data } = await api.get('/orders');
    const list = Array.isArray(data) ? data : (data?.orders || data || []);
    return list.map(nodeOrderToApp);
  }

  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    if (updates.status) {
      return this.updateOrderStatus(orderId, updates.status);
    }
    // No generic patch endpoint; return fresh order
    const res = await this.getOrder(orderId);
    if (!res) throw new Error('Order not found');
    return res;
  }

  static async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    opts?: { trackingNumber?: string; estimatedDelivery?: string; adminNotes?: string }
  ): Promise<Order> {
    const nodeStatus = mapStatusToNode(status);
    const body: any = { status: nodeStatus };
    if (opts?.trackingNumber) body.trackingNumber = opts.trackingNumber;
    if (opts?.estimatedDelivery) body.estimatedDelivery = opts.estimatedDelivery;
    if (opts?.adminNotes) body.adminNotes = opts.adminNotes;
    const { data } = await api.patch(`/orders/${orderId}/status`, body);
    return nodeOrderToApp(data);
  }

  static async getOrderProductionUpdates(orderId: string): Promise<ProductionUpdate[]> {
    const { data } = await api.get(`/orders/${orderId}/production-updates`);
    const list = Array.isArray(data) ? data : (data?.updates || data || []);
    return (list as any[]).map((pu: any) => ({
      id: pu.id,
      order_id: pu.orderId,
      stage: pu.stage,
      status: pu.status,
      title: pu.stage ? `${pu.stage} update` : 'Update',
      description: pu.description,
      photos: pu.photos || [],
      documents: pu.documents || [],
      estimated_completion: pu.estimatedCompletion,
      actual_completion: pu.actualCompletion,
      created_by: pu.createdBy,
      visible_to_customer: pu.visibleToCustomer ?? true,
      created_at: String(pu.createdAt || ''),
      updated_at: String(pu.updatedAt || ''),
    }));
  }

  static async createProductionUpdate(payload: { order_id: string } & any): Promise<ProductionUpdate> {
    const { order_id, ...rest } = payload || {};
    const { data } = await api.post(`/orders/${order_id}/production`, rest);
    const pu = data;
    return {
      id: pu.id,
      order_id: pu.orderId,
      stage: pu.stage,
      status: pu.status,
      title: pu.stage ? `${pu.stage} update` : 'Update',
      description: pu.description,
      photos: pu.photos || [],
      documents: pu.documents || [],
      estimated_completion: pu.estimatedCompletion,
      actual_completion: pu.actualCompletion,
      created_by: pu.createdBy,
      visible_to_customer: pu.visibleToCustomer ?? true,
      created_at: String(pu.createdAt || ''),
      updated_at: String(pu.updatedAt || ''),
    };
  }

  static async getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    const { data } = await api.get(`/orders/${orderId}/timeline`);
    const list = Array.isArray(data) ? data : (data?.events || data || []);
    return (list as any[]).map((ev: any) => ({
      id: ev.id,
      order_id: ev.orderId,
      event_type: ev.eventType,
      description: ev.description,
      event_data: ev.eventData || {},
      trigger_source: (ev.triggerSource || 'api') as any,
      created_at: String(ev.createdAt || ''),
    }));
  }

  static async createCheckout(orderId: string, phase: string): Promise<{ url: string }> {
    const serverPhase = ((): 'full_payment' | 'shipping_fee' => {
      const p = String(phase || '').toLowerCase();
      if (p.includes('ship')) return 'shipping_fee';
      // Map deposit/balance/full -> full_payment
      return 'full_payment';
    })();
    const { data } = await api.post('/payments/create-checkout', { orderId, phase: serverPhase });
    return { url: data?.url };
  }

  static async createInvoice(orderId: string): Promise<{ invoiceUrl: string }> {
    const { data } = await api.post('/payments/create-invoice', { orderId });
    return { invoiceUrl: data?.invoiceUrl };
  }

  static async getOrderPayments(orderId: string): Promise<any[]> {
    // Admin-only endpoint on server; if unauthorized, return empty list
    try {
      const { data } = await api.get(`/orders/${orderId}/payment`);
      const list = Array.isArray(data) ? data : (data?.payments || data || []);
      return (list as any[]).map((p: any) => ({
        id: p.id,
        order_id: p.orderId,
        phase: 'full',
        amount_cents: Number(p.amountCents || 0),
        currency: p.currency || 'usd',
        status: p.status || 'pending',
        stripe_payment_intent_id: p.stripePaymentIntentId || undefined,
        stripe_checkout_session_id: p.stripeCheckoutSessionId || undefined,
        stripe_charge_id: p.stripeChargeId || undefined,
        paid_at: p.paidAt ? String(p.paidAt) : undefined,
        metadata: p.metadata || {},
        created_at: String(p.createdAt || ''),
        updated_at: String(p.updatedAt || ''),
      }));
    } catch {
      return [];
    }
  }

  static async createTimelineEvent(orderId: string, event: { eventType: string; description?: string; eventData?: any; triggerSource?: string }): Promise<OrderTimelineEvent> {
    const { data } = await api.post(`/orders/${orderId}/timeline`, event);
    return {
      id: data.id,
      order_id: data.orderId,
      event_type: data.eventType,
      description: data.description,
      event_data: data.eventData || {},
      trigger_source: (data.triggerSource || 'api') as any,
      created_at: String(data.createdAt || ''),
    };
  }

  // No-op real-time subscriptions for now (compatibility with store API)
  static subscribeToOrder(_orderId: string, _cb: (order: Order) => void) {
    return { unsubscribe() {} } as any;
  }
  static subscribeToProductionUpdates(_orderId: string, _cb: (update: ProductionUpdate) => void) {
    return { unsubscribe() {} } as any;
  }
  static subscribeToPayments(_orderId: string, _cb: (payment: any) => void) {
    return { unsubscribe() {} } as any;
  }
}
