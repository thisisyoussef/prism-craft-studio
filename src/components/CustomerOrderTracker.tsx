import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, CheckCircle, Package, Truck, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { OrderService } from '@/lib/services/orderService';
import { useToast } from '@/hooks/use-toast';
import type { Order, ProductionUpdate, Payment, OrderTimelineEvent } from '@/lib/types/order';

interface CustomerOrderTrackerProps {
  orderId: string;
}

const customerStages = [
  { 
    stage: 'deposit_pending', 
    label: 'Deposit payment', 
    description: 'Complete your deposit to start production',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'bg-amber-100 text-amber-800'
  },
  { 
    stage: 'deposit_paid', 
    label: 'Design review', 
    description: 'We\'re reviewing your design and preparing for production',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    stage: 'in_production', 
    label: 'In production', 
    description: 'Your order is being crafted with care',
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-800'
  },
  { 
    stage: 'quality_check', 
    label: 'Quality check', 
    description: 'Final quality inspection before completion',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-indigo-100 text-indigo-800'
  },
  { 
    stage: 'balance_pending', 
    label: 'Balance payment', 
    description: 'Complete final payment to proceed with shipping',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'bg-orange-100 text-orange-800'
  },
  { 
    stage: 'ready_to_ship', 
    label: 'Ready to ship', 
    description: 'Your order is packed and ready for shipment',
    icon: <Package className="w-5 h-5" />,
    color: 'bg-green-100 text-green-800'
  },
  { 
    stage: 'shipped', 
    label: 'Shipped', 
    description: 'Your order is on its way to you',
    icon: <Truck className="w-5 h-5" />,
    color: 'bg-green-100 text-green-800'
  },
  { 
    stage: 'delivered', 
    label: 'Delivered', 
    description: 'Your order has been delivered',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-green-100 text-green-800'
  }
];

export function CustomerOrderTracker({ orderId }: CustomerOrderTrackerProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [updates, setUpdates] = useState<ProductionUpdate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      const orderService = new OrderService();
      
      // Load order details
      const orderData = await orderService.getOrder(orderId);
      setOrder(orderData);
      
      // Load production updates (customer visible only)
      const productionUpdates = await orderService.getProductionUpdates(orderId);
      setUpdates(productionUpdates.filter(update => update.visible_to_customer));
      
      // Load payments
      const orderPayments = await orderService.getPayments(orderId);
      setPayments(orderPayments);
      
      // Load timeline
      const orderTimeline = await orderService.getTimeline(orderId);
      setTimeline(orderTimeline);
      
    } catch (error) {
      console.error('Failed to load order data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStageIndex = () => {
    if (!order) return -1;
    return customerStages.findIndex(s => s.stage === order.status);
  };

  const getPaymentStatus = (phase: 'deposit' | 'balance') => {
    return payments.find(p => p.phase === phase);
  };

  const handlePayment = async (phase: 'deposit' | 'balance') => {
    if (!order) return;
    
    try {
      // This would integrate with the existing checkout flow
      const payment = getPaymentStatus(phase);
      if (payment && payment.amount_cents) {
        // Redirect to Stripe checkout
        const response = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            phase,
            amountCents: payment.amount_cents,
            currency: 'usd'
          })
        });
        
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to initiate payment. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Order Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Order {order.order_number}</h1>
        <p className="text-muted-foreground">
          Placed on {format(new Date(order.created_at), 'MMMM dd, yyyy')}
        </p>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Product details</h3>
              <p className="text-sm text-muted-foreground mb-1">
                {order.customization?.product_type || 'Custom apparel'}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                Quantity: {order.quantity}
              </p>
              <p className="text-sm text-muted-foreground">
                Total: ${order.total_amount?.toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Payment breakdown</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Deposit (40%):</span>
                  <span>${order.deposit_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance (60%):</span>
                  <span>${order.balance_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {customerStages.map((stage, index) => {
              const currentIndex = getCurrentStageIndex();
              const isCompleted = currentIndex > index;
              const isCurrent = order.status === stage.stage;
              const isPending = currentIndex < index;
              
              return (
                <div key={stage.stage} className="flex items-start gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 flex-shrink-0 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : stage.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${
                        isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {stage.label}
                      </h3>
                      {isCurrent && (
                        <Badge className={stage.color}>Current</Badge>
                      )}
                    </div>
                    
                    <p className={`text-sm ${
                      isCurrent || isCompleted ? 'text-muted-foreground' : 'text-gray-400'
                    }`}>
                      {stage.description}
                    </p>
                    
                    {/* Payment Actions */}
                    {(stage.stage === 'deposit_pending' || stage.stage === 'balance_pending') && isCurrent && (
                      <div className="mt-3">
                        {(() => {
                          const phase = stage.stage === 'deposit_pending' ? 'deposit' : 'balance';
                          const payment = getPaymentStatus(phase);
                          
                          if (payment?.status === 'succeeded') {
                            return (
                              <Badge className="bg-green-100 text-green-800">
                                Payment completed
                              </Badge>
                            );
                          }
                          
                          return (
                            <Button 
                              onClick={() => handlePayment(phase)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Pay ${payment?.amount_cents ? (payment.amount_cents / 100).toFixed(2) : '0.00'}
                            </Button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Production Updates */}
      {updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">
                      {update.stage.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(update.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  
                  {update.description && (
                    <p className="text-sm mb-3">{update.description}</p>
                  )}
                  
                  {update.photos && update.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {update.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Production update ${index + 1}`}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-medium mb-2">Questions about your order?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We're here to help with any questions or concerns.
            </p>
            <Button variant="outline" size="sm">
              Contact support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
