import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Order, ProductionUpdate, Payment } from '@/lib/types/order';

interface NotificationEvent {
  id: string;
  type: 'order_update' | 'production_update' | 'payment_update';
  title: string;
  message: string;
  timestamp: string;
  orderId?: string;
  read: boolean;
}

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to order updates
    const orderChannel = supabase
      .channel('order_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new as Order;
          if (payload.eventType === 'UPDATE') {
            const notification: NotificationEvent = {
              id: `order_${order.id}_${Date.now()}`,
              type: 'order_update',
              title: 'Order Status Updated',
              message: `Order ${order.order_number} status changed to ${order.status?.replace(/_/g, ' ')}`,
              timestamp: new Date().toISOString(),
              orderId: order.id,
              read: false
            };
            
            addNotification(notification);
            
            toast({
              title: notification.title,
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to production updates
    const productionChannel = supabase
      .channel('production_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'production_updates',
        },
        async (payload) => {
          const update = payload.new as ProductionUpdate;
          
          // Check if this update is for user's order and visible to customer
          if (update.visible_to_customer) {
            const { data: order } = await supabase
              .from('orders')
              .select('user_id, order_number')
              .eq('id', update.order_id)
              .single();
              
            if (order?.user_id === userId) {
              const notification: NotificationEvent = {
                id: `production_${update.id}_${Date.now()}`,
                type: 'production_update',
                title: 'Production Update',
                message: `New update for order ${order.order_number}: ${update.description?.slice(0, 100)}${update.description && update.description.length > 100 ? '...' : ''}`,
                timestamp: new Date().toISOString(),
                orderId: update.order_id,
                read: false
              };
              
              addNotification(notification);
              
              toast({
                title: notification.title,
                description: notification.message,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to payment updates
    const paymentChannel = supabase
      .channel('payment_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
          const payment = payload.new as Payment;
          
          // Check if this payment is for user's order
          const { data: order } = await supabase
            .from('orders')
            .select('user_id, order_number')
            .eq('id', payment.order_id)
            .single();
            
          if (order?.user_id === userId && payment.status === 'succeeded') {
            const notification: NotificationEvent = {
              id: `payment_${payment.id}_${Date.now()}`,
              type: 'payment_update',
              title: 'Payment Confirmed',
              message: `${payment.phase === 'deposit' ? 'Deposit' : 'Balance'} payment confirmed for order ${order.order_number}`,
              timestamp: new Date().toISOString(),
              orderId: payment.order_id,
              read: false
            };
            
            addNotification(notification);
            
            toast({
              title: notification.title,
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      orderChannel.unsubscribe();
      productionChannel.unsubscribe();
      paymentChannel.unsubscribe();
    };
  }, [userId, toast]);

  const addNotification = (notification: NotificationEvent) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}
