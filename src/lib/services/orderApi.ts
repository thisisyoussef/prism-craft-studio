import { http } from '../http';
import type { Order, CreateOrderPayload, UpdateOrderPayload, Payment, ProductionUpdate, OrderTimelineEvent } from '../types/order';

export const orderApi = {
	create: (payload: CreateOrderPayload) => http.post<Order>('/api/orders', payload),
	list: (filters?: { status?: string; limit?: number; offset?: number; userId?: string }) => http.get<Order[]>('/api/orders', filters),
	get: (id: string) => http.get<Order>(`/api/orders/${id}`),
	update: (id: string, updates: UpdateOrderPayload) => http.patch<Order>(`/api/orders/${id}`, updates),
	payments: (id: string) => http.get<Payment[]>(`/api/orders/${id}/payments`),
	createProductionUpdate: (id: string, payload: Omit<ProductionUpdate, 'id' | 'order_id' | 'created_at' | 'updated_at' | 'title' | 'visible_to_customer'>) => http.post<ProductionUpdate>(`/api/orders/${id}/production-updates`, payload),
	productionUpdates: (id: string) => http.get<ProductionUpdate[]>(`/api/orders/${id}/production-updates`),
	timeline: (id: string) => http.get<OrderTimelineEvent[]>(`/api/orders/${id}/timeline`),
	createTimeline: (id: string, payload: { eventType: string; description: string; eventData?: Record<string, any>; triggerSource?: string }) => http.post<OrderTimelineEvent>(`/api/orders/${id}/timeline`, payload),
};