import { useEffect, useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import { useLocation, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useOrderStore, useAuthStore } from '@/lib/store'
import { supabase } from '@/integrations/supabase/client'
import { OrderService } from '@/lib/services/orderService'
import toast from 'react-hot-toast'
import { serverErrorMessage } from '@/lib/errors'
import { ScrollReveal, ScrollStagger } from '@/components/ScrollReveal'

interface PaymentRow {
  phase: 'deposit' | 'balance'
  amount_cents: number
  status: string
}

const currency = (cents?: number) => typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '$0.00'

const OrderDetails = () => {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuthStore()
  const { startCheckout } = useOrderStore()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [payments, setPayments] = useState<Record<'deposit' | 'balance', PaymentRow | null>>({ deposit: null, balance: null })
  const [updates, setUpdates] = useState<Array<{ id: string; stage: string; status: string; description?: string | null; photos?: string[] | null; created_at: string }>>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [artworkUrls, setArtworkUrls] = useState<Record<string, string>>({})
  const [composer, setComposer] = useState<{ stage: string; status: string; description: string; files: File[] }>({ stage: 'draft', status: 'started', description: '', files: [] })

  const totals = useMemo(() => {
    const totalDollars = Number(order?.total_amount || 0)
    const totalCents = Math.round(totalDollars * 100)
    const depositCents = payments.deposit?.amount_cents ?? Math.round(totalCents * 0.4)
    const balanceCents = payments.balance?.amount_cents ?? Math.max(totalCents - depositCents, 0)
    return { totalCents, depositCents, balanceCents, totalDollars }
  }, [order?.total_amount, payments.deposit?.amount_cents, payments.balance?.amount_cents])

  const statusSteps = useMemo(() => (
    [
      { key: 'draft', label: 'Draft' },
      { key: 'pending', label: 'Pending' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'in_production', label: 'In Production' },
      { key: 'shipped', label: 'Shipped' },
      { key: 'delivered', label: 'Delivered' },
    ]
  ), [])

  const currentStepIndex = useMemo(() => {
    const idx = statusSteps.findIndex(s => s.key === order?.status)
    return idx === -1 ? 0 : idx
  }, [order?.status, statusSteps])

  const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(url)
  const colorSwatch = (nameOrHex?: string) => {
    if (!nameOrHex) return '#e5e7eb'
    if (/^#|rgb|hsl/i.test(nameOrHex)) return nameOrHex
    // simple map of common names used in customizer
    const map: Record<string,string> = { Black:'#111827', White:'#ffffff', Gray:'#6b7280', Navy:'#1f2937', Red:'#ef4444', Blue:'#3b82f6', Green:'#10b981', Purple:'#8b5cf6', Yellow:'#f59e0b' }
    return map[nameOrHex] || '#e5e7eb'
  }
  const titleCase = (s?: string) => (s || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())

  // Generate signed URLs for artwork files from 'artwork' bucket
  useEffect(() => {
    const genUrls = async () => {
      try {
        if (!order?.id) return
        const files: string[] = Array.isArray(order?.artwork_files) ? order.artwork_files : []
        if (!files.length) return
        const entries: Array<[string, string]> = []
        for (const name of files) {
          // If already an absolute URL, just use it
          if (/^https?:\/\//i.test(name)) {
            entries.push([name, name])
            continue
          }
          const candidates = [
            `${order.id}/${name}`,
            `${order.id}/updates/${name}`,
            name,
          ]
          let signed: string | null = null
          for (const key of candidates) {
            const res = await (supabase as any).storage.from('artwork').createSignedUrl(key, 60 * 60)
            if (!res.error && res.data?.signedUrl) { signed = res.data.signedUrl; break }
          }
          if (signed) entries.push([name, signed])
        }
        if (entries.length) setArtworkUrls(Object.fromEntries(entries))
      } catch (e) {
        console.warn('Failed to create signed artwork URLs', e)
      }
    }
    genUrls()
  }, [order?.id, Array.isArray(order?.artwork_files) ? order.artwork_files.join('|') : ''])

  // Also sign any photo paths referenced in production updates
  useEffect(() => {
    const signUpdatePhotos = async () => {
      try {
        const paths = updates.flatMap(u => Array.isArray(u.photos) ? u.photos : [])
        if (!paths.length) return
        const entries: Array<[string, string]> = []
        for (const path of paths) {
          if (artworkUrls[path]) continue
          const res = await (supabase as any).storage.from('artwork').createSignedUrl(path, 60 * 60)
          if (!res.error && res.data?.signedUrl) entries.push([path, res.data.signedUrl])
        }
        if (entries.length) setArtworkUrls(prev => ({ ...prev, ...Object.fromEntries(entries) }))
      } catch (e) {
        console.warn('Failed to sign update photos', e)
      }
    }
    signUpdatePhotos()
  }, [updates.map(u => (u.photos || []).join('|')).join('||')])

  const canPay = (p?: PaymentRow | null) => {
    const st = p?.status
    if (!st) return true
    return !['succeeded', 'processing', 'requires_capture', 'canceled'].includes(st)
  }

  const advanceStatus = async () => {
    try {
      if (!order?.status) return
      const idx = statusSteps.findIndex(s => s.key === order.status)
      const next = statusSteps[idx + 1]?.key
      if (!next) return toast.error('No next status')
      const reason = window.prompt(`Advance status to ${titleCase(next)}. Optional note:`) || ''
      await postUpdateAndSetStatus(next, 'updated', reason, [])
      toast.success('Status advanced')
    } catch (e: any) {
      toast.error(serverErrorMessage(e, 'Failed to advance status'))
    }
  }

  const revertStatus = async () => {
    try {
      if (!order?.status) return
      const idx = statusSteps.findIndex(s => s.key === order.status)
      const prev = statusSteps[idx - 1]?.key
      if (!prev) return toast.error('No previous status')
      const reason = window.prompt(`Revert status to ${titleCase(prev)}. Optional note:`) || ''
      await postUpdateAndSetStatus(prev, 'updated', reason, [])
      toast.success('Status reverted')
    } catch (e: any) {
      toast.error(serverErrorMessage(e, 'Failed to revert status'))
    }
  }

  const submitUpdate = async () => {
    try {
      if (!order?.id) return
      // Upload photos to storage
      const uploaded: string[] = []
      for (const f of composer.files) {
        const path = `${order.id}/updates/${Date.now()}_${f.name}`
        const { error: upErr } = await (supabase as any).storage.from('artwork').upload(path, f, { upsert: true })
        if (!upErr) uploaded.push(path)
      }
      await postUpdateAndSetStatus(
        composer.stage || order.status,
        composer.status || 'updated',
        composer.description || '',
        uploaded
      )
      setComposer({ stage: order.status, status: 'updated', description: '', files: [] })
      toast.success('Update posted')
    } catch (e: any) {
      toast.error(serverErrorMessage(e, 'Failed to post update'))
    }
  }

  // Centralized helper: update order.status and insert production_updates, then refresh updates list
  const postUpdateAndSetStatus = async (
    stage: string,
    status: string,
    description: string,
    photos: string[]
  ) => {
    if (!order?.id) return
    // Update order status first
    const { error: upErr } = await (supabase as any)
      .from('orders')
      .update({ status: stage })
      .eq('id', order.id)
    if (upErr) throw upErr

    // Insert production update record
    const { error: puErr } = await (supabase as any)
      .from('production_updates')
      .insert({
        order_id: order.id,
        stage,
        status: status || 'updated',
        description: description || null,
        photos: photos.length ? photos : null,
      })
    if (puErr) throw puErr

    // Update local order state immediately so timeline reflects new status
    setOrder((o: any) => ({ ...o, status: stage }))

    // Reload updates to include the new one at the top
    const { data: updRows } = await (supabase as any)
      .from('production_updates')
      .select('id, stage, status, description, photos, created_at')
      .eq('order_id', order.id)
    if (Array.isArray(updRows)) {
      const sorted = [...updRows].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setUpdates(sorted as any)
    }
  }

  const fetchUpdates = async (orderData: any) => {
    if (!orderData?.id) return
    const { data: updRows } = await (supabase as any)
      .from('production_updates')
      .select('id, stage, status, description, photos, created_at')
      .eq('order_id', orderData.id)
    if (Array.isArray(updRows)) {
      const sorted = [...updRows].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setUpdates(sorted as any)
    }
  }

  const fetchArtworkUrls = async (orderData: any) => {
    if (!orderData?.artwork_files?.length) return
    const urls: Record<string, string> = {}
    for (const filePath of orderData.artwork_files) {
      try {
        const { data } = await supabase.storage
          .from('artwork')
          .createSignedUrl(filePath, 3600)
        if (data?.signedUrl) {
          urls[filePath] = data.signedUrl
        }
      } catch (e) {
        console.warn('Failed to get signed URL for:', filePath, e)
      }
    }
    setArtworkUrls(urls)
  }

  useEffect(() => {
    const run = async () => {
      // Guard: avoid querying when id is the placeholder 'new' or missing
      if (!id || id === 'new') {
        setLoading(false)
        setOrder(null)
        return
      }
      try {
        setLoading(true)
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single()
        if (orderErr) throw orderErr
        setOrder(orderData)

        const { data: paymentRows, error: payErr } = await (supabase as any)
          .from('payments')
          .select('phase, amount_cents, status')
          .eq('order_id', id)
        if (payErr) throw payErr
        const byPhase: any = { deposit: null, balance: null }
        ;(paymentRows || []).forEach((p: PaymentRow) => { byPhase[p.phase] = p })
        setPayments(byPhase)

        await fetchUpdates(orderData)
        await fetchArtworkUrls(orderData)

        // Determine admin/moderator role
        if (user?.id) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          const role = (profile as any)?.role
          setIsAdmin(role === 'admin' || role === 'moderator')
        } else {
          setIsAdmin(false)
        }
      } catch (e: any) {
        console.error(e)
        toast.error(serverErrorMessage(e, 'Failed to load order'))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  // Realtime subscriptions: keep payments and order status in sync
  useEffect(() => {
    // Guard: skip realtime when id is placeholder 'new' or missing
    if (!id || id === 'new') return

    const refetchPayments = async () => {
      const { data: paymentRows } = await (supabase as any)
        .from('payments')
        .select('phase, amount_cents, status')
        .eq('order_id', id)
      const byPhase: any = { deposit: null, balance: null }
      ;(paymentRows || []).forEach((p: PaymentRow) => { byPhase[p.phase] = p })
      setPayments(byPhase)
    }

    // Set up real-time subscriptions for live updates
    const paymentSubscription = supabase
      .channel(`payments-${id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'payments',
          filter: `order_id=eq.${id}`
        }, 
        (payload) => {
          // Update payment status in real-time
          const updatedPayment = payload.new as any
          if (updatedPayment) {
            setPayments(prev => ({
              ...prev,
              [updatedPayment.phase]: updatedPayment
            }))
          }
        }
      )
      .subscribe()

    const orderSubscription = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${id}`
        }, 
        (payload) => {
          // Update order status in real-time
          const updatedOrder = payload.new as any
          if (updatedOrder) {
            setOrder(updatedOrder)
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      paymentSubscription.unsubscribe()
      orderSubscription.unsubscribe()
    }
    const refetchOrder = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, products(name, image_url)')
        .eq('id', id)
        .single()
      if (orderData) setOrder(orderData)
    }

    const channel = (supabase as any)
      .channel(`order-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `order_id=eq.${id}` }, async () => {
        await refetchPayments()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, async () => {
        await refetchOrder()
      })
      .subscribe()

    return () => {
      try { (supabase as any).removeChannel(channel) } catch {}
    }
  }, [id])

  // On return from Stripe, poll until the indicated phase shows as succeeded.
  useEffect(() => {
    // Guard: skip Stripe polling when id is placeholder 'new' or missing
    if (!id || id === 'new') return
    const params = new URLSearchParams(location.search)
    const payment = params.get('payment') // success | cancelled
    const phase = (params.get('phase') as 'deposit' | 'balance' | null)
    const sessionId = params.get('session_id')
    if (!payment || !phase) return

    let cancelled = false
    const clearParams = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('phase')
      window.history.replaceState({}, '', url.toString())
    }

    const poll = async () => {
      // immediate feedback
      if (payment === 'cancelled') {
        toast.error(`${phase === 'deposit' ? 'Deposit' : 'Balance'} payment was cancelled`)
        clearParams()
        return
      }
      toast.success('Payment received. Finalizing your order...')

      // If we have a session id, proactively mark payment as processing so UI doesn't show requires_payment_method
      if (sessionId) {
        try {
          await (supabase as any)
            .from('payments')
            .update({ status: 'processing', stripe_checkout_session_id: sessionId })
            .eq('order_id', id)
            .eq('phase', phase)
            .in('status', ['requires_payment_method', 'requires_action'])
        } catch {}
      }

      const started = Date.now()
      const timeoutMs = 60_000
      const intervalMs = 1_000
      let success = false
      while (!cancelled && Date.now() - started < timeoutMs) {
        const { data: paymentRows } = await (supabase as any)
          .from('payments')
          .select('phase, amount_cents, status')
          .eq('order_id', id)
        const byPhase: any = { deposit: null, balance: null }
        ;(paymentRows || []).forEach((p: PaymentRow) => { byPhase[p.phase] = p })
        setPayments(byPhase)
        if (byPhase[phase]?.status === 'succeeded') {
          toast.success(`${phase === 'deposit' ? 'Deposit' : 'Balance'} marked as paid`)
          // Also refresh order to reflect any status advancement set by webhook
          try {
            const { data: orderData } = await supabase
              .from('orders')
              .select('*')
              .eq('id', id)
              .single()
            if (orderData) setOrder(orderData)
          } catch {}
          success = true
          break
        }
        await new Promise(r => setTimeout(r, intervalMs))
      }

      // Fallback: if polling timed out, invoke reconcile-payment edge function
      if (!success && !cancelled) {
        try {
          await (supabase as any).functions.invoke('reconcile-payment', {
            body: { session_id: sessionId, order_id: id, phase },
          })
          // refetch payments
          const { data: paymentRows } = await (supabase as any)
            .from('payments')
            .select('phase, amount_cents, status')
            .eq('order_id', id)
          const byPhase: any = { deposit: null, balance: null }
          ;(paymentRows || []).forEach((p: PaymentRow) => { byPhase[p.phase] = p })
          setPayments(byPhase)
          if (byPhase[phase]?.status === 'succeeded') {
            toast.success('Payment reconciled successfully')
            try {
              const { data: orderData } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single()
              if (orderData) setOrder(orderData)
            } catch {}
          }
        } catch (e) {
          console.warn('Reconcile fallback failed', e)
        }
      }

      clearParams()
    }

    poll()
    return () => { cancelled = true }
  }, [id, location.search])

  const handlePay = async (phase: 'deposit' | 'balance') => {
    if (!user) {
      return toast.error('Please sign in to pay for your order')
    }
    if (!id) return
    try {
      await startCheckout(id, phase)
    } catch {}
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <ScrollReveal variant="fade-up" distancePx={18}>
          <h1 className="text-3xl font-medium text-foreground mb-4">Order Details</h1>
        </ScrollReveal>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !order ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <ScrollReveal asChild variant="fade-up">
              <Card className="p-4 md:col-span-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span>Order #</span><span className="flex items-center gap-2">{order.order_number || order.id}<button className="text-xs px-1 py-0.5 border rounded" onClick={() => { navigator.clipboard.writeText(order.order_number || order.id); toast.success('Order # copied') }}>Copy</button></span></div>
                    <div className="flex justify-between"><span>Status</span><span className="uppercase">{order.status}</span></div>
                    <div className="flex justify-between"><span>Total</span><span>${(order.total_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Created</span><span>{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</span></div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Product</h3>
                    <div className="flex items-start gap-3 text-sm">
                      {order.products?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.products.image_url} alt={order.products?.name || 'Product'} className="w-16 h-16 object-cover rounded" />
                      ) : null}
                      <div>
                        <div className="text-foreground">{order.products?.name || 'Custom Product'}</div>
                        <div className="text-muted-foreground">Quantity: {order.quantity}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Artwork Files</h3>
                    {Array.isArray(order.artwork_files) && order.artwork_files.length ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {order.artwork_files.map((url: string, i: number) => (
                          <div key={i} className="border rounded p-2 bg-muted/30">
                            {(() => {
                              const signed = artworkUrls[url]
                              if (signed && isImageUrl(url)) {
                                // eslint-disable-next-line @next/next/no-img-element
                                return <img src={signed} alt={`Artwork ${i + 1}`} className="w-full h-28 object-cover rounded" />
                              }
                              if (/^https?:\/\//i.test(url) && isImageUrl(url)) {
                                // eslint-disable-next-line @next/next/no-img-element
                                return <img src={url} alt={`Artwork ${i + 1}`} className="w-full h-28 object-cover rounded" />
                              }
                              return <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">File</div>
                            })()}
                            {(() => {
                              const signed = artworkUrls[url]
                              const href = signed || (/^https?:\/\//i.test(url) ? url : undefined)
                              return href ? (
                                <a href={href} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-primary truncate">{url}</a>
                              ) : (
                                <span className="mt-2 block text-xs text-muted-foreground truncate" title="Not uploaded to storage">{url}</span>
                              )
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No artwork uploaded.</div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Items</h3>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Sizes</div>
                        {(() => {
                          const map = (order?.customization_details as any)?.sizes
                          const arr = order?.sizes
                          if (map && typeof map === 'object' && !Array.isArray(map)) {
                            const entries = Object.entries(map as Record<string, number>).filter(([,q]) => (q||0) > 0)
                            if (!entries.length) return <div>—</div>
                            return (
                              <div className="grid grid-cols-2 gap-x-4">
                                {entries.map(([size, qty]) => (
                                  <div key={size} className="flex justify-between"><span>{size}</span><span className="text-muted-foreground">× {qty}</span></div>
                                ))}
                              </div>
                            )
                          }
                          return <div>{Array.isArray(arr) && arr.length ? arr.join(', ') : '—'}</div>
                        })()}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Colors</div>
                        <div>{(order.colors || []).length ? (order.colors || []).join(', ') : '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Customization</h3>
                    {order.customization_details ? (
                      <div className="space-y-4">
                        {(() => {
                          const details = order.customization_details as any
                          const baseColor = details?.baseColor
                          const prints: any[] = Array.isArray(details?.prints) ? details.prints : []
                          return (
                            <>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-muted-foreground">Base Color:</span>
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: colorSwatch(baseColor) }} />
                                  {baseColor || '—'}
                                </span>
                              </div>
                              {prints.length ? (
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {prints.map((p, idx) => (
                                    <div key={p?.id || idx} className="border rounded-md p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1 text-sm">
                                          <div className="font-medium">{titleCase(p?.location) || 'Placement'}</div>
                                          <div className="text-muted-foreground">Method: {p?.method || '—'}</div>
                                          {p?.size ? (
                                            <div className="text-muted-foreground">Size: {p.size?.widthIn} × {p.size?.heightIn} in</div>
                                          ) : null}
                                          <div className="text-muted-foreground">Colors: {p?.colorCount ?? (Array.isArray(p?.colors) ? p.colors.length : '—')}</div>
                                          {Array.isArray(p?.colors) && p.colors.length ? (
                                            <div className="flex items-center gap-1 mt-1">
                                              {p.colors.slice(0,6).map((c: string, i: number) => (
                                                <span key={i} className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: colorSwatch(c) }} title={c} />
                                              ))}
                                              {p.colors.length > 6 ? <span className="text-xs text-muted-foreground">+{p.colors.length - 6}</span> : null}
                                            </div>
                                          ) : null}
                                          {p?.customText ? (
                                            <div className="pt-1"><span className="text-muted-foreground">Text:</span> {p.customText}</div>
                                          ) : null}
                                          {p?.notes ? (
                                            <div className="text-xs text-muted-foreground whitespace-pre-wrap">{p.notes}</div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No print placements added.</div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">No customization details.</div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Notes</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes || '—'}</div>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">40% deposit now, 60% before shipping.</div>
                </div>
              </Card>
            </ScrollReveal>

            <div className="space-y-4">
              <ScrollReveal asChild variant="fade-up" delayMs={60}>
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Status Timeline</h3>
                  <ol className="relative border-l pl-4">
                    {statusSteps.map((step, idx) => {
                      const done = idx < currentStepIndex
                      const active = idx === currentStepIndex
                      const cancelled = order.status === 'cancelled'
                      const dotClass = cancelled && active ? 'bg-destructive' : done || active ? 'bg-primary' : 'bg-muted-foreground/30'
                      return (
                        <li key={step.key} className="mb-4 ml-2">
                          <div className={`w-3 h-3 rounded-full ${dotClass} absolute -left-[7px] mt-1.5`}></div>
                          <div className={`text-sm ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</div>
                        </li>
                      )
                    })}
                    {order.status === 'cancelled' && (
                      <li className="ml-2">
                        <div className="w-3 h-3 rounded-full bg-destructive absolute -left-[7px] mt-1.5"></div>
                        <div className="text-sm text-destructive">Cancelled</div>
                      </li>
                    )}
                  </ol>
                </Card>
              </ScrollReveal>
              <ScrollReveal asChild variant="fade-up" delayMs={120}>
                <Card className="p-4 space-y-3">
                  <h3 className="font-medium">Payments</h3>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div>Deposit (40%)</div>
                      <div className="text-muted-foreground">{currency(totals.depositCents)}</div>
                    </div>
                    {(() => {
                      const s = payments.deposit?.status
                      const disabled = s === 'succeeded' || s === 'processing' || s === 'requires_action'
                      const label = s === 'succeeded' ? 'Paid' : s === 'processing' ? 'Processing…' : s === 'requires_action' ? 'Confirming…' : 'Pay Deposit'
                      return (
                        <Button size="sm" onClick={() => handlePay('deposit')} disabled={disabled}>
                          {label}
                        </Button>
                      )
                    })()}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div>Balance (60%)</div>
                      <div className="text-muted-foreground">{currency(totals.balanceCents)}</div>
                    </div>
                    {(() => {
                      const s = payments.balance?.status
                      const disabled = s === 'succeeded' || s === 'processing' || s === 'requires_action'
                      const label = s === 'succeeded' ? 'Paid' : s === 'processing' ? 'Processing…' : s === 'requires_action' ? 'Confirming…' : 'Pay Balance'
                      return (
                        <Button size="sm" variant="outline" onClick={() => handlePay('balance')} disabled={disabled}>
                          {label}
                        </Button>
                      )
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Total: ${totals.totalDollars.toFixed(2)}
                  </div>
                </Card>
              </ScrollReveal>

              {updates.length > 0 && (
                <ScrollReveal asChild variant="fade-up" delayMs={180}>
                  <Card className="p-4 space-y-3">
                    <h3 className="font-medium">Production Updates</h3>
                    <ScrollStagger intervalMs={60}>
                      <div className="space-y-3">
                        {updates.map((u) => (
                          <div key={u.id} className="border rounded p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{titleCase(u.stage)}</div>
                              <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</div>
                            </div>
                            <div className="text-muted-foreground">Status: {titleCase(u.status)}</div>
                            {u.description ? (
                              <div className="mt-1 whitespace-pre-wrap">{u.description}</div>
                            ) : null}
                            {Array.isArray(u.photos) && u.photos.length ? (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {u.photos.slice(0,6).map((url, i) => (
                                  <a key={i} href={artworkUrls[url] || url} target="_blank" rel="noreferrer" className="block">
                                    {isImageUrl(url) ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={artworkUrls[url] || url} alt="update" className="w-full h-20 object-cover rounded" />
                                    ) : (
                                      <div className="w-full h-20 bg-muted/50 rounded text-[10px] flex items-center justify-center">View</div>
                                    )}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </ScrollStagger>
                  </Card>
                </ScrollReveal>
              )}

              {isAdmin && (
                <ScrollReveal asChild variant="fade-up" delayMs={220}>
                  <Card className="p-4 space-y-3">
                    <h3 className="font-medium">Post Production Update</h3>
                    <div className="grid sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Stage</div>
                        <select className="w-full border rounded px-2 py-1" value={composer.stage} onChange={(e) => setComposer({ ...composer, stage: e.target.value })}>
                          {statusSteps.map(s => (<option key={s.key} value={s.key}>{s.label}</option>))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Status</div>
                        <select className="w-full border rounded px-2 py-1" value={composer.status} onChange={(e) => setComposer({ ...composer, status: e.target.value })}>
                          <option value="started">Started</option>
                          <option value="updated">Updated</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Photos</div>
                        <input type="file" multiple accept="image/*" onChange={(e) => setComposer({ ...composer, files: Array.from(e.target.files || []) })} />
                      </div>
                    </div>
                    <textarea
                      className="w-full border rounded p-2 text-sm"
                      placeholder="Notes..."
                      value={composer.description}
                      onChange={(e) => setComposer({ ...composer, description: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={submitUpdate}>Post Update</Button>
                      <Button variant="outline" size="sm" onClick={() => setComposer({ stage: order.status, status: 'updated', description: '', files: [] })}>Reset</Button>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="secondary" onClick={revertStatus}>Revert Status</Button>
                      <Button size="sm" onClick={advanceStatus}>Advance Status</Button>
                    </div>
                  </Card>
                </ScrollReveal>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
