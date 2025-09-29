import { useEffect, useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import { useLocation, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useOrderStore, useAuthStore } from '@/lib/store'
import { uploadFile } from '@/lib/services/fileService'
import toast from 'react-hot-toast'
import { serverErrorMessage } from '@/lib/errors'
import { ScrollReveal, ScrollStagger } from '@/components/ScrollReveal'
import { OrderService } from '@/lib/services/orderServiceNode'
import { Helmet } from 'react-helmet-async'
import { sendOrderUpdateEmail } from '@/lib/email'

const currency = (cents?: number) => typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '$0.00'

const OrderDetails = () => {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuthStore()
  const { startCheckout, fetchOrder, fetchOrderPayments, fetchProductionUpdates, fetchOrderTimeline, updateOrderStatus, createProductionUpdate } = useOrderStore()
  const paymentsMap = useOrderStore(s => s.payments)
  const timelineMap = useOrderStore(s => s.timeline)
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [payment, setPayment] = useState<{ amount_cents: number; status: string } | null>(null)
  const [updates, setUpdates] = useState<Array<{ id: string; stage: string; status: string; description?: string | null; photos?: string[] | null; created_at: string }>>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [artworkUrls, setArtworkUrls] = useState<Record<string, string>>({})
  const [composer, setComposer] = useState<{ stage: string; status: string; description: string; files: File[] }>({ stage: 'submitted', status: 'started', description: '', files: [] })
  const [actionMessage, setActionMessage] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [invoiceBusy, setInvoiceBusy] = useState(false)
  const SUPPORT_EMAIL = (import.meta as any).env?.VITE_SUPPORT_EMAIL || (import.meta as any).env?.VITE_RESEND_EMAIL || ''

  const totals = useMemo(() => {
    const totalDollars = Number(order?.total_amount || 0)
    const totalCents = Math.round(totalDollars * 100)
    return { totalCents, totalDollars }
  }, [order?.total_amount])

  const statusSteps = useMemo(() => (
    [
      { key: 'submitted', label: 'Payment' },
      { key: 'paid', label: 'Design Review' },
      { key: 'in_production', label: 'In Production' },
      { key: 'shipping', label: 'Shipping' },
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

  const handleGetInvoice = async () => {
    try {
      if (!order?.id) return
      setInvoiceBusy(true)
      const { invoiceUrl } = await OrderService.createInvoice(order.id)
      if (invoiceUrl) {
        window.open(invoiceUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Failed to create invoice')
      }
    } catch (e: any) {
      toast.error(serverErrorMessage(e, 'Failed to create invoice'))
    } finally {
      setInvoiceBusy(false)
    }
  }

  const postTimelineEventIfAllowed = async (eventType: string, description?: string) => {
    try {
      if (!order?.id) return
      // Server route is admin-only; this will no-op for customers
      await OrderService.createTimelineEvent(order.id, { eventType, description, triggerSource: 'api' })
    } catch (_e) { /* ignore non-admin errors */ }
  }

  const handleRequestChanges = async () => {
    try {
      if (!order?.id) return
      setActionBusy(true)
      const subjectNote = `Change request for order ${order.order_number || order.id}`
      if (SUPPORT_EMAIL) {
        await sendOrderUpdateEmail(SUPPORT_EMAIL, {
          order_number: order.order_number,
          order_id: order.id,
          status: order.status,
          explanation: subjectNote,
          notes: actionMessage || null,
        })
      }
      await postTimelineEventIfAllowed('customer_request_changes', actionMessage)
      toast.success('Request sent')
      setActionMessage('')
    } catch (e: any) {
      toast.error(serverErrorMessage(e, 'Failed to send request'))
    } finally {
      setActionBusy(false)
    }
  }

  const handleApproveDesign = async () => {
    try {
      if (!order?.id) return
      setActionBusy(true)
      const subjectNote = `Design approved for order ${order.order_number || order.id}`
      if (SUPPORT_EMAIL) {
        await sendOrderUpdateEmail(SUPPORT_EMAIL, {
          order_number: order.order_number,
          order_id: order.id,
          status: order.status,
          explanation: subjectNote,
          notes: actionMessage || null,
        })
      }
      await postTimelineEventIfAllowed('design_approved', actionMessage)
      toast.success('Approval sent')
      setActionMessage('')
    } catch (e: any) {
      toast.error(serverErrorMessage(e, 'Failed to send approval'))
    } finally {
      setActionBusy(false)
    }
  }
  const titleCase = (s?: string) => (s || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
  const formatAddress = (addr?: any) => {
    if (!addr) return '—'
    const lines = [
      [addr.name, addr.company].filter(Boolean).join(' · '),
      [addr.address_line_1, addr.address_line_2].filter(Boolean).join(', '),
      [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
      addr.country,
      addr.phone ? `Phone: ${addr.phone}` : undefined,
    ].filter(Boolean)
    return lines.join('\n')
  }
  const trackingUrl = (tn?: string) => tn ? `https://parcelsapp.com/en/tracking/${encodeURIComponent(tn)}` : undefined

  // Node API: no Supabase storage signing. Use absolute URLs directly if present.
  useEffect(() => {
    try {
      if (!order?.id) return
      const files: string[] = Array.isArray(order?.artwork_files) ? order.artwork_files : []
      const entries: Array<[string, string]> = []
      for (const name of files) {
        if (/^https?:\/\//i.test(name)) entries.push([name, name])
      }
      if (entries.length) setArtworkUrls(Object.fromEntries(entries))
    } catch {}
  }, [order?.id, Array.isArray(order?.artwork_files) ? order.artwork_files.join('|') : ''])

  // No-op signing for update photos; absolute URLs will render directly.
  useEffect(() => {
    return
  }, [updates.map(u => (u.photos || []).join('|')).join('||')])

  // No deposit/balance; single payment now.  

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
      // Upload photos to Node API and collect URLs
      const uploaded: string[] = []
      if (composer.files && composer.files.length) {
        for (const f of composer.files) {
          try {
            const url = await uploadFile(f, { orderId: order.id, filePurpose: 'production_update' })
            if (url) uploaded.push(url)
          } catch (e) {
            console.warn('Failed to upload file', f?.name, e)
          }
        }
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
    // Update order status via Node API
    await updateOrderStatus(order.id, stage as any)
    // Create production update via Node API
    await createProductionUpdate({ 
      order_id: order.id, 
      stage, 
      status: status || 'updated', 
      title: titleCase(stage) + ' update',
      description: description || null, 
      photos 
    })
    // Refresh order and updates
    const refreshed = await fetchOrder(order.id)
    if (refreshed) setOrder(refreshed)
    const upd = await fetchProductionUpdates(order.id)
    if (Array.isArray(upd)) setUpdates(upd as any)
  }

  const fetchUpdates = async (orderData: any) => {
    if (!orderData?.id) return
    const upd = await fetchProductionUpdates(orderData.id)
    if (Array.isArray(upd)) setUpdates(upd as any)
  }

  const fetchArtworkUrls = async (_orderData: any) => {
    // No-op: artwork files are not stored in Supabase anymore; absolute URLs will display directly.
    setArtworkUrls((prev) => prev)
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
        const ord = await fetchOrder(id)
        if (!ord) throw new Error('Order not found')
        setOrder(ord)

        // Optional: fetch payments from Node (admin-only endpoint may return empty)
        try { await fetchOrderPayments(id) } catch {}
        try { await fetchOrderTimeline(id) } catch {}

        await fetchUpdates(ord)
        await fetchArtworkUrls(ord)

        // Determine admin role from Node auth user
        setIsAdmin(user?.role === 'admin')
        // initialize composer stage to current order status
        setComposer(prev => ({ ...prev, stage: ord.status }))
      } catch (e: any) {
        console.error(e)
        toast.error(serverErrorMessage(e, 'Failed to load order'))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  // Realtime subscriptions removed for Node API version (optional to add later).
  useEffect(() => { return }, [id])

  // On return from Stripe, give immediate feedback and clear params (Node API handles lifecycle).
  useEffect(() => {
    if (!id || id === 'new') return
    const params = new URLSearchParams(location.search)
    const payment = params.get('payment') // success | cancelled
    const phase = params.get('phase') // full_payment | shipping_fee
    if (!payment) return

    const clearParams = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('phase')
      window.history.replaceState({}, '', url.toString())
    }

    ;(async () => {
      if (payment === 'cancelled') {
        toast.error(`${phase === 'shipping_fee' ? 'Shipping' : 'Order'} payment was cancelled`)
        clearParams()
        return
      }
      try {
        // Mark order as paid (server simulates finalization)
        await OrderService.markOrderPaid(id as string)
        toast.success('Payment received. Finalizing your order...')
        // Refresh current order
        const refreshed = await fetchOrder(id as string)
        if (refreshed) setOrder(refreshed)
      } catch (e) {
        console.warn('Failed to mark order paid', e)
      }
      clearParams()
    })()
  }, [id, location.search])

  const handlePay = async () => {
    if (!user) {
      return toast.error('Please sign in to pay for your order')
    }
    if (!id) return
    try {
      await startCheckout(id, 'full_payment')
    } catch {}
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Helmet>
        <title>{order ? `Order ${order.order_number || order.id} • Prism Craft` : 'Order Details • Prism Craft'}</title>
        <meta name="description" content="View your order details, payment status, shipping information, and production updates." />
      </Helmet>
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <ScrollReveal variant="fade-up" distancePx={18}>
          <div className="mb-2">
            <a href="/dashboard" className="text-sm text-muted-foreground underline hover:text-foreground">← Back to dashboard</a>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-medium text-foreground">Order Details</h1>
            {isAdmin && order?.id ? (
              <a
                href={`/admin/orders/${order.id}`}
                className="text-sm text-primary underline"
                title="Open in admin"
              >
                Open in admin
              </a>
            ) : null}
          </div>
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
                      <div>
                        <div className="text-foreground">{order.product_name || 'Custom Product'}</div>
                        <div className="text-muted-foreground">Quantity: {order.quantity}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Design preview</h3>
                    {order.mockup_images && (order.mockup_images.front || order.mockup_images.back) ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {order.mockup_images.front ? (
                          <div className="border rounded p-2 bg-muted/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={order.mockup_images.front} alt="Front mockup" className="w-full h-28 object-cover rounded" />
                            <div className="mt-1 text-xs text-muted-foreground">Front</div>
                          </div>
                        ) : null}
                        {order.mockup_images.back ? (
                          <div className="border rounded p-2 bg-muted/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={order.mockup_images.back} alt="Back mockup" className="w-full h-28 object-cover rounded" />
                            <div className="mt-1 text-xs text-muted-foreground">Back</div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No design previews.</div>
                    )}
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
                    {order.customization_details || Array.isArray(order.print_locations) ? (
                      <div className="space-y-4">
                        {(() => {
                          const details = (order.customization_details as any) || {}
                          const baseColor = details?.baseColor ?? (order.customization?.baseColor)
                          const prints: any[] = Array.isArray(details?.prints)
                            ? details.prints
                            : (Array.isArray(order.print_locations) ? order.print_locations : [])
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

                <div className="text-xs text-muted-foreground">You will be charged now.</div>
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

            <ScrollReveal asChild variant="fade-up" delayMs={150}>
              <Card className="p-4 space-y-3">
                <h3 className="font-medium">Actions</h3>
                <div className="text-xs text-muted-foreground">We’ll notify our team with your message.</div>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  placeholder="Add a note (optional)"
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleRequestChanges} disabled={actionBusy}>
                    {actionBusy ? 'Sending…' : 'Request changes'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleApproveDesign} disabled={actionBusy}>
                    {actionBusy ? 'Sending…' : 'Approve design'}
                  </Button>
                </div>
                {!SUPPORT_EMAIL ? (
                  <div className="text-xs text-muted-foreground">Support email not configured. You can email us directly with your order number.</div>
                ) : null}
              </Card>
            </ScrollReveal>
              <ScrollReveal asChild variant="fade-up" delayMs={90}>
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Shipping</h3>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Address</div>
                      <pre className="text-sm whitespace-pre-wrap leading-relaxed">{formatAddress(order.shipping_address)}</pre>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Tracking</div>
                        {order.tracking_number ? (
                          <a className="text-primary underline" href={trackingUrl(order.tracking_number)} target="_blank" rel="noreferrer">{order.tracking_number}</a>
                        ) : (
                          <div className="text-muted-foreground">—</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Estimated delivery</div>
                        <div className="text-muted-foreground">{order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>
              <ScrollReveal asChild variant="fade-up" delayMs={120}>
                <Card className="p-4 space-y-3">
                  <h3 className="font-medium">Payment</h3>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div>Order total</div>
                      <div className="text-muted-foreground">{currency(totals.totalCents)}</div>
                    </div>
                    {(() => {
                      const isPaid = order?.status !== 'submitted'
                      const label = isPaid ? 'Paid' : 'Pay Now'
                      return (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={handlePay} disabled={isPaid}>
                            {label}
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleGetInvoice} disabled={invoiceBusy}>
                            {invoiceBusy ? 'Creating…' : 'Get invoice'}
                          </Button>
                        </div>
                      )
                    })()}
                  </div>
                  {(() => {
                    const arr = order?.id ? (paymentsMap[order.id] || []) : []
                    if (!arr.length) return null
                    return (
                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium mb-2">Payment history</div>
                        <div className="space-y-2">
                          {arr.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-sm">
                              <div>
                                <div className="text-foreground">{titleCase(p.status)}</div>
                                <div className="text-xs text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleString() : new Date(p.created_at).toLocaleString()}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{currency(p.amount_cents)}</div>
                                {p.stripe_checkout_session_id ? (
                                  <a className="text-xs text-primary underline" href={`https://dashboard.stripe.com/payments/${p.stripe_checkout_session_id}`} target="_blank" rel="noreferrer">Receipt</a>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
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

              {order?.id && (timelineMap[order.id]?.length || 0) > 0 && (
                <ScrollReveal asChild variant="fade-up" delayMs={200}>
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Activity</h3>
                    <div className="space-y-2 text-sm">
                      {timelineMap[order.id]!.map(ev => (
                        <div key={ev.id} className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-foreground">{titleCase(ev.event_type)}</div>
                            {ev.description ? <div className="text-muted-foreground">{ev.description}</div> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
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
