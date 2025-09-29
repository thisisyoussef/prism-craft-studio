import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, CheckCircle, Package, Truck, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { OrderService } from '@/lib/services/orderServiceNode';
import { useToast } from '@/hooks/use-toast';
import type { Order, ProductionUpdate, Payment, OrderTimelineEvent } from '@/lib/types/order';

interface CustomerOrderTrackerProps {
  orderId: string;
}

const customerStages = [
  { 
    stage: 'submitted', 
    label: 'Payment', 
    description: 'Complete your payment to start production',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'bg-amber-100 text-amber-800'
  },
  { 
    stage: 'paid', 
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
    stage: 'shipping', 
    label: 'Shipping', 
    description: 'We\'re preparing your shipment.',
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
      // Load order details
      const orderData = await OrderService.getOrder(orderId);
      setOrder(orderData);
      
      // Load production updates (customer visible only)
      const productionUpdates = await OrderService.getOrderProductionUpdates(orderId);
      setUpdates(productionUpdates.filter(update => update.visible_to_customer));
      
      // Load payments
      const orderPayments = await OrderService.getOrderPayments(orderId);
      setPayments(orderPayments);
      
      // Load timeline
      const orderTimeline = await OrderService.getOrderTimeline(orderId);
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

  const getPaymentStatus = () => {
    const fromServer = payments.find(p => p.phase === 'full');
    if (fromServer) return fromServer;
    if (!order) return undefined as any;
    const amount_cents = Math.round(Number(order.total_amount || 0) * 100);
    const paid = order.status !== 'submitted';
    return { phase: 'full', amount_cents, status: paid ? 'succeeded' : 'pending' } as any;
  };

  const handlePayment = async () => {
    if (!order) return;
    
    try {
      const { url } = await OrderService.createCheckout(order.id, 'full_payment');
      if (url) window.location.href = url;
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
                {order.product_name || order.product_category || 'Custom apparel'}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                Quantity: {order.quantity}
              </p>
              <p className="text-sm text-muted-foreground">
                Total: ${order.total_amount?.toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Payment</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>${order.total_amount?.toFixed(2)}</span>
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
                    
                    {/* Payment Action */}
                    {stage.stage === 'submitted' && isCurrent && (
                      <div className="mt-3">
                        {(() => {
                          const payment = getPaymentStatus();
                          if (payment?.status === 'succeeded') {
                            return (
                              <Badge className="bg-green-100 text-green-800">
                                Payment completed
                              </Badge>
                            );
                          }
                          return (
                            <Button 
                              onClick={() => handlePayment()}
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
