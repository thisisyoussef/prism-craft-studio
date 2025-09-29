import api from '@/lib/api'

export type GuestOrderCreatePayload = {
  email: string
  productCategory: string
  productName: string
  quantity: number
  unitPrice?: number
  totalAmount: number
  customization?: Record<string, any>
  colors?: string[]
  sizes?: Record<string, number>
  printLocations?: string[]
  shippingAddress?: Record<string, any>
}

export async function createGuestOrder(payload: GuestOrderCreatePayload) {
  const { data } = await api.post('/guest/orders', payload)
  return data
}

export async function listGuestOrders() {
  const { data } = await api.get('/guest/orders')
  return Array.isArray(data) ? data : (data?.orders || data || [])
}

export async function getGuestOrder(id: string) {
  const { data } = await api.get(`/guest/orders/${id}`)
  return data
}

export async function requestGuestLink(email: string, orderId?: string) {
  const { data } = await api.post('/guest/auth/request-link', { email, orderId })
  return data
}

export async function verifyGuestToken(token: string) {
  const { data } = await api.post('/guest/auth/verify', { token })
  return data as { token: string; email: string }
}

export async function createGuestCheckout(orderId: string, phase: 'full_payment' | 'shipping_fee' = 'full_payment') {
  const { data } = await api.post('/payments/create-checkout', { orderId, phase })
  return data as { url?: string }
}
