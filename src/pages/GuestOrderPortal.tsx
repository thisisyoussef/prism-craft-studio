import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import { listGuestOrders, createGuestCheckout } from '@/lib/services/guestOrderService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface GuestOrder {
  id: string
  orderNumber: string
  productCategory: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: string
  createdAt: string
  updatedAt: string
}

export default function GuestOrderPortal() {
  const [orders, setOrders] = useState<GuestOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const data = await listGuestOrders()
        setOrders(data)
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const payNow = async (orderId: string) => {
    try {
      setPayingId(orderId)
      const { url } = await createGuestCheckout(orderId, 'full_payment')
      if (url) window.location.href = url
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to start checkout')
      setPayingId(null)
    }
  }

  return (
    <>
      <Navigation />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Your Orders</h1>
          <p className="text-sm text-muted-foreground">Access your orders via the magic link we sent to your email.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading orders…
              </div>
            ) : error ? (
              <div className="py-10 text-center text-sm text-red-600">{error}</div>
            ) : orders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No orders yet. Try <a className="underline" href="/find-order">requesting a new link</a>.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>{o.orderNumber}</TableCell>
                        <TableCell>{o.productName}</TableCell>
                        <TableCell>{o.quantity}</TableCell>
                        <TableCell>${Number(o.totalAmount).toFixed(2)}</TableCell>
                        <TableCell className="capitalize">{o.status.replace('_', ' ')}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="mr-2" asChild>
                            <a href={`/products/${encodeURIComponent(o.productCategory)}`}>View product</a>
                          </Button>
                          <Button size="sm" onClick={() => payNow(o.id)} disabled={payingId === o.id}>
                            {payingId === o.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Pay now
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
