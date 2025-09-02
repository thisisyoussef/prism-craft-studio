// Order Flow Types - Complete type definitions for the new order system

export type OrderStatus = 
  | 'draft'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'in_production'
  | 'quality_check'
  | 'balance_pending'
  | 'balance_paid'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentPhase = 'deposit' | 'balance' | 'full' | 'refund';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface PrintLocation {
  id: string;
  location: 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'collar' | 'tag';
  method: 'screen-print' | 'embroidery' | 'vinyl' | 'dtg' | 'dtf' | 'heat_transfer';
  colors: string[];
  colorCount: number;
  size?: {
    widthIn: number;
    heightIn: number;
  };
  position?: {
    x: number; // -1 to 1
    y: number; // -1 to 1
  };
  rotationDeg?: number;
  customText?: string;
  artworkFiles?: File[];
  notes?: string;
}

export interface OrderCustomization {
  baseColor: string;
  printLocations: PrintLocation[];
  method: string;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  order_number: string;
  
  // Customer info
  user_id: string;
  company_id?: string;
  
  // Product details
  product_id?: string;
  product_name: string;
  product_category: string;
  
  // Order specifics
  quantity: number;
  unit_price: number;
  total_amount: number;
  
  // Customization
  customization: OrderCustomization;
  colors: string[];
  sizes: Record<string, number>;
  print_locations: PrintLocation[];
  
  // Status and workflow
  status: OrderStatus;
  priority: OrderPriority;
  labels: string[];
  
  // Payment tracking
  deposit_amount: number;
  balance_amount: number;
  deposit_paid_at?: string;
  balance_paid_at?: string;
  
  // Shipping
  shipping_address?: {
    name: string;
    company?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  tracking_number?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  
  // Files and notes
  artwork_files: string[];
  production_notes?: string;
  customer_notes?: string;
  admin_notes?: string;
  
  // Stripe integration
  stripe_deposit_payment_intent?: string;
  stripe_balance_payment_intent?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  phase: PaymentPhase;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  stripe_charge_id?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  metadata: Record<string, any>;
}

export interface ProductionUpdate {
  id: string;
  order_id: string;
  stage: string;
  status: string;
  title: string;
  description?: string;
  photos: string[];
  documents: string[];
  estimated_completion?: string;
  actual_completion?: string;
  created_by?: string;
  visible_to_customer: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderTimelineEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_data: Record<string, any>;
  description: string;
  triggered_by?: string;
  trigger_source: 'manual' | 'system' | 'webhook' | 'api';
  created_at: string;
}

// Order creation payload
export interface CreateOrderPayload {
  product_name: string;
  product_category: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customization: OrderCustomization;
  colors: string[];
  sizes: Record<string, number>;
  print_locations: PrintLocation[];
  artwork_files?: string[];
  customer_notes?: string;
  shipping_address?: Order['shipping_address'];
  priority?: OrderPriority;
  status?: OrderStatus;
}

// Order update payload
export interface UpdateOrderPayload {
  status?: OrderStatus;
  priority?: OrderPriority;
  labels?: string[];
  production_notes?: string;
  admin_notes?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
}

// Payment creation payload
export interface CreatePaymentPayload {
  order_id: string;
  phase: PaymentPhase;
  amount_cents: number;
  currency?: string;
}

// Production update creation payload
export interface CreateProductionUpdatePayload {
  order_id: string;
  stage: string;
  status: string;
  title: string;
  description?: string;
  photos?: string[];
  documents?: string[];
  estimated_completion?: string;
  actual_completion?: string;
  visible_to_customer?: boolean;
}
