import { useMemo, useState, useRef, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore, useOrderStore, usePricingStore, useGuestStore, type PrintPlacement, type PrintLocation, type PrintMethod } from '@/lib/store'
import { Upload, FileText, Calculator, ZoomIn, ZoomOut, Images, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthDialog from './AuthDialog'
import GuestDetailsDialog from './GuestDetailsDialog'
import { supabase } from '@/lib/supabase'
import { customizerSchema, type CustomizerInput } from '@/lib/validation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendGuestDraftEmail } from '../lib/email'
import { useNavigate } from 'react-router-dom'
import GarmentMockup, { type GarmentType } from './GarmentMockups'
import { PRODUCT_CATALOG, PRODUCT_MAP } from '@/lib/products'

type CustomizerMode = 'dialog' | 'page'

interface ProductCustomizerProps {
  mode?: CustomizerMode
}

// Helper: does a print location belong to the currently selected mockup view?
function matchView(location: PrintLocation, view: 'front' | 'back' | 'sleeve') {
  if (view === 'front') return location === 'front' || location === 'collar' || location === 'tag'
  if (view === 'back') return location === 'back' || location === 'collar' || location === 'tag'
  // sleeve view: show both sleeves
  return location.includes('sleeve')
}

// Printable bounds per product/view (percent of mockup canvas)
type Bounds = { left: number; top: number; width: number; height: number }
function getBounds(product: GarmentType, view: 'front' | 'back' | 'sleeve'): Bounds {
  // Defaults tuned for a 300x300 viewBox and our silhouettes
  if (view === 'sleeve') {
    // Long, horizontal sleeve panel area
    return { left: 32, top: 44, width: 40, height: 22 }
  }
  switch (product) {
    case 'hoodie':
      return view === 'front'
        ? { left: 28, top: 28, width: 44, height: 54 }
        : { left: 28, top: 30, width: 44, height: 56 }
    case 'polo':
      return view === 'front'
        ? { left: 30, top: 28, width: 40, height: 52 }
        : { left: 30, top: 30, width: 40, height: 54 }
    case 'sweatshirt':
      return view === 'front'
        ? { left: 26, top: 30, width: 48, height: 54 }
        : { left: 26, top: 32, width: 48, height: 56 }
    case 't-shirt':
    default:
      return view === 'front'
        ? { left: 28, top: 26, width: 44, height: 56 }
        : { left: 28, top: 28, width: 44, height: 58 }
  }
}

// Helper: compute overlay style within bounds from normalized position/size
function overlayStyleFor(p: PrintPlacement, bounds: Bounds): CSSProperties {
  const baseW = 12
  const baseH = 16
  const widthPct = Math.min(bounds.width, Math.max(5, (p?.size?.widthIn ?? 6) / baseW * 60))
  const heightPct = Math.min(bounds.height, Math.max(5, (p?.size?.heightIn ?? 8) / baseH * 60))
  const x = typeof p?.position?.x === 'number' ? p.position.x : 0 // -1..1 relative to bounds
  const y = typeof p?.position?.y === 'number' ? p.position.y : 0 // -1..1 relative to bounds
  let left = bounds.left + (bounds.width * (0.5 + x * 0.5)) - widthPct / 2
  let top = bounds.top + (bounds.height * (0.5 + y * 0.5)) - heightPct / 2
  // Clamp inside bounds
  left = Math.max(bounds.left, Math.min(bounds.left + bounds.width - widthPct, left))
  top = Math.max(bounds.top, Math.min(bounds.top + bounds.height - heightPct, top))
  return { left: `${left}%`, top: `${top}%`, width: `${widthPct}%`, height: `${heightPct}%` }
}

// removed inline ShirtMockup in favor of reusable GarmentMockup

const ProductCustomizer = ({ mode = 'dialog' }: ProductCustomizerProps) => {
  const navigate = useNavigate()
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedBaseColor, setSelectedBaseColor] = useState<string>('White')
  const [selectedView, setSelectedView] = useState<'front' | 'back' | 'sleeve'>('front')
  const [zoom, setZoom] = useState<number>(1)
  const [sizesQty, setSizesQty] = useState<Record<string, number>>({})
  const [artworkFiles, setArtworkFiles] = useState<File[]>([])
  const [customText, setCustomText] = useState('')
  const [notes, setNotes] = useState('')

  const { user } = useAuthStore()
  const { addOrder } = useOrderStore()
  const { quantity, customization, price, prints, addPrint, updatePrint, removePrint, duplicatePrint, updateQuantity, updateProductType, updateCustomization } = usePricingStore()
  const { info, address } = useGuestStore()
  const [confirmOpen, setConfirmOpen] = useState(false)
  // react-hook-form for live validation
  const form = useForm<CustomizerInput>({
    resolver: zodResolver(customizerSchema),
    mode: 'onChange',
    defaultValues: {
      productId: selectedProduct || '',
      selectedColors,
      sizesQty,
      prints,
    },
  })
  const { setValue, formState } = form
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<{ id: string } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; corner: 'nw' | 'ne' | 'sw' | 'se' } | null>(null)
  const [rotating, setRotating] = useState<{ id: string } | null>(null)
  const lastMouse = useRef<{ x: number; y: number } | null>(null)
  const rafId = useRef<number | null>(null)
  const pendingEvent = useRef<{ x: number; y: number } | null>(null)
  // Track artwork aspect ratio per print so the border can hug the image bounds
  const [artworkAspect, setArtworkAspect] = useState<Record<string, number>>({})
  // Cache blob URLs per print/file to avoid re-creating every render (prevents flashing)
  const urlCache = useRef<Record<string, string>>({})

  // Keep RHF in sync with local state for live validation
  useEffect(() => {
    setValue('productId', selectedProduct || '', { shouldValidate: true })
  }, [selectedProduct])
  useEffect(() => {
    setValue('selectedColors', selectedColors, { shouldValidate: true })
  }, [selectedColors])
  useEffect(() => {
    setValue('sizesQty', sizesQty, { shouldValidate: true })
  }, [sizesQty])
  useEffect(() => {
    setValue('prints', prints, { shouldValidate: true })
  }, [prints])

  // Cleanup unused blob URLs when prints/artwork change
  useEffect(() => {
    const inUse = new Set<string>()
    prints.forEach(p => {
      const f = Array.isArray(p.artworkFiles) && p.artworkFiles[0]
      if (f instanceof File) {
        const key = `${p.id}::${f.name}::${f.lastModified}::${f.size}`
        inUse.add(key)
      }
    })
    Object.keys(urlCache.current).forEach(key => {
      if (!inUse.has(key)) {
        try { URL.revokeObjectURL(urlCache.current[key]) } catch {}
        delete urlCache.current[key]
      }
    })
    return () => {
      // On unmount, revoke all
      Object.values(urlCache.current).forEach(u => { try { URL.revokeObjectURL(u) } catch {} })
      urlCache.current = {}
    }
  }, [prints])

  // Canonical products from PricingCalculator
  const products = Object.fromEntries(
    PRODUCT_CATALOG.map(p => [p.id, { name: p.name, basePrice: p.basePrice }])
  ) as Record<string, { name: string; basePrice: number }>

  const colorSwatches: Record<string, string> = {
    Black: '#111827',
    White: '#ffffff',
    Gray: '#6b7280',
    Navy: '#1f2937',
    Red: '#ef4444',
    Blue: '#3b82f6',
    Green: '#10b981',
    Purple: '#8b5cf6',
    Yellow: '#f59e0b',
  }
  const colors = Object.keys(colorSwatches)
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const placements = ['front','back','left_sleeve','right_sleeve','collar','tag']

  const garmentType: GarmentType = (PRODUCT_MAP as any)[selectedProduct]?.mockupType ?? 't-shirt'
  const bounds = getBounds(garmentType, selectedView)

  const addPrintForCurrentView = () => {
    const defaultLocation: PrintLocation = selectedView === 'front' ? 'front' : selectedView === 'back' ? 'back' : 'right_sleeve'
    const allowedMethods: PrintMethod[] = ['screen-print','embroidery','vinyl','dtg','dtf','heat_transfer']
    const method: PrintMethod = allowedMethods.includes(customization as PrintMethod) ? (customization as PrintMethod) : 'screen-print'
    addPrint({ location: defaultLocation, method })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setArtworkFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setArtworkFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev => {
      const next = prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
      setValue('selectedColors', next, { shouldValidate: true })
      return next
    })
  }

  const updateSizeQty = (size: string, qty: number) => {
    setSizesQty(prev => {
      const next = { ...prev, [size]: Math.max(0, qty) }
      const total = Object.values(next).reduce((a, b) => a + (b || 0), 0)
      updateQuantity(Math.max(50, total || 0))
      setValue('sizesQty', next, { shouldValidate: true })
      return next
    })
  }

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error('Please sign in to create an order')
      return
    }

    // Sync latest state to form and validate
    setValue('productId', selectedProduct || '')
    setValue('selectedColors', selectedColors)
    setValue('sizesQty', sizesQty)
    setValue('prints', prints)
    const valid = await form.trigger()
    if (!valid) {
      const errs = formState.errors
      const messages = [errs.productId?.message, errs.selectedColors?.message, errs.sizesQty?.message, errs.prints?.message].filter(Boolean) as string[]
      toast.error(messages.join('\n'))
      return
    }

    try {
      const orderPayload = {
        productId: selectedProduct,
        quantity,
        colors: selectedColors,
        sizes: sizesQty,
        customizationDetails: {
          baseColor: selectedBaseColor,
          prints: prints.map(p => ({
            id: p.id,
            location: p.location,
            method: p.method,
            colors: p.colors,
            colorCount: p.colorCount,
            size: p.size,
            position: p.position,
            rotationDeg: p.rotationDeg,
            customText: p.customText,
            notes: p.notes,
          })),
        },
        artworkFiles: artworkFiles.map(f => f.name),
        notes,
        totalAmount: price,
      }

      const created = await addOrder(orderPayload)
      toast.success('Order created successfully!')
      // Navigate to order details for payment actions
      if (created?.id) {
        navigate(`/orders/${created.id}`)
      }
      resetForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create order'
      toast.error(message)
    }
  }

  const resetForm = () => {
    setSelectedProduct('')
    setSelectedColors([])
    setSelectedBaseColor('White')
    setSizesQty({})
    setArtworkFiles([])
    setCustomText('')
    setNotes('')
  }

  const isFormValid = useMemo(() => {
    const selectedSizes = Object.values(sizesQty).some(q => (q || 0) > 0)
    return Boolean(selectedProduct) && selectedColors.length > 0 && selectedSizes && prints.length > 0
  }, [selectedProduct, selectedColors, sizesQty, prints])

  // Inline SVG mockup replaces external placeholder

  const Content = (
    <div className="grid xl:grid-cols-2 gap-8">
      {/* Left: Configuration Panel */}
      <div className="space-y-6">
        {/* Product Selection */}
        <div className="space-y-3">
          <Label>Product Type *</Label>
          <Select 
            value={selectedProduct} 
            onValueChange={(value) => {
              setSelectedProduct(value)
              updateProductType(value)
              setValue('productId', value, { shouldValidate: true })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(products).map(([key, product]) => (
                <SelectItem key={key} value={key}>
                  {product.name} - ${products[key as keyof typeof products].basePrice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formState.errors.productId?.message && (
            <div className="text-xs text-destructive">{formState.errors.productId.message}</div>
          )}
        </div>

        {/* Quantity Summary (auto from sizes) */}
        <div className="space-y-2">
          <Label>Total Quantity</Label>
          <Input type="number" value={quantity} readOnly className="bg-muted/50" />
          <div className="text-xs text-muted-foreground">Calculated from size quantities. Minimum 50 pieces.</div>
        </div>

        {/* Color Selection */}
        <div className="space-y-3">
          <Label>Garment Base Color</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(colorSwatches).map(([name, hex]) => (
              <button
                key={name}
                type="button"
                className={`w-8 h-8 rounded-full border ${selectedBaseColor === name ? 'ring-2 ring-primary' : 'border-border'}`}
                style={{ backgroundColor: hex }}
                onClick={() => setSelectedBaseColor(name)}
                aria-label={name}
                title={name}
              />
            ))}
          </div>
        </div>

        {/* Print Colors */}
        <div className="space-y-3">
          <Label>Print Colors * ({selectedColors.length} selected)</Label>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <div key={color} className="flex items-center gap-2">
                <button
                  type="button"
                  className={`w-7 h-7 rounded-full border ${selectedColors.includes(color) ? 'ring-2 ring-primary' : 'border-border'}`}
                  style={{ backgroundColor: colorSwatches[color] }}
                  onClick={() => toggleColor(color)}
                  aria-label={color}
                  title={color}
                />
                <span className="text-xs">{color}</span>
              </div>
            ))}
          </div>
          {formState.errors.selectedColors?.message && (
            <div className="text-xs text-destructive">{formState.errors.selectedColors.message}</div>
          )}
        </div>

        {/* Sizes with quantities */}
        <div className="space-y-3">
          <Label>Sizes * (enter quantities)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sizes.map((size) => (
              <div key={size} className="flex items-center gap-2">
                <Badge variant="outline" className="w-12 justify-center">{size}</Badge>
                <Input
                  type="number"
                  min={0}
                  value={sizesQty[size] ?? 0}
                  onChange={(e) => updateSizeQty(size, parseInt(e.target.value || '0'))}
                  className="w-24"
                />
              </div>
            ))}
          </div>
          {formState.errors.sizesQty?.message && (
            <div className="text-xs text-destructive">{formState.errors.sizesQty.message}</div>
          )}
        </div>

        {/* Customization Method */}
        <div className="space-y-3">
          <Label>Customization Method</Label>
          <Select value={customization} onValueChange={updateCustomization}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="screen-print">Screen Printing (Included)</SelectItem>
              <SelectItem value="embroidery">Embroidery (Included)</SelectItem>
              <SelectItem value="vinyl">Vinyl Transfer (Included)</SelectItem>
              <SelectItem value="dtg">Direct-to-Garment (Included)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Print Placements (multiple) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Print Placements</Label>
            <Button type="button" variant="outline" size="sm" onClick={addPrintForCurrentView} disabled={prints.length >= 4}>
              <Plus className="w-4 h-4 mr-1" /> Add Print
            </Button>
          </div>
          {formState.errors.prints?.message && (
            <div className="text-xs text-destructive">{formState.errors.prints.message}</div>
          )}
          {prints.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add up to 4 prints (front, back, sleeves, etc.).</p>
          ) : (
            <div className="space-y-3">
              {prints.map((p) => (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-36">
                      <Label className="text-xs">Location</Label>
                      <Select value={p.location} onValueChange={(v) => updatePrint(p.id, { location: v as PrintLocation })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {placements.map(loc => (
                            <SelectItem key={loc} value={loc}>{loc.replace('_',' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-44">
                      <Label className="text-xs">Method</Label>
                      <Select value={p.method} onValueChange={(v) => updatePrint(p.id, { method: v as PrintMethod })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="screen-print">screen-print</SelectItem>
                          <SelectItem value="embroidery">embroidery</SelectItem>
                          <SelectItem value="vinyl">vinyl</SelectItem>
                          <SelectItem value="dtg">dtg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-40">
                      <Label className="text-xs">Size (W x H in)</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} step={0.5} value={p.size.widthIn}
                          onChange={(e) => updatePrint(p.id, { size: { ...p.size, widthIn: parseFloat(e.target.value || '0') } })} />
                        <span className="text-muted-foreground">×</span>
                        <Input type="number" min={1} step={0.5} value={p.size.heightIn}
                          onChange={(e) => updatePrint(p.id, { size: { ...p.size, heightIn: parseFloat(e.target.value || '0') } })} />
                      </div>
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">Colors</Label>
                      <Input type="number" min={1} max={10} value={p.colorCount}
                        onChange={(e) => updatePrint(p.id, { colorCount: Math.max(1, parseInt(e.target.value || '1')) })} />
                    </div>
                    <div className="w-40">
                      <Label className="text-xs">Artwork</Label>
                      <Select
                        value={(() => {
                          const f = Array.isArray(p.artworkFiles) && p.artworkFiles[0]
                          if (f instanceof File) return f.name
                          if (typeof f === 'string' && f) return f
                          return undefined
                        })()}
                        onValueChange={(val) => {
                          const file = artworkFiles.find(f => f.name === val)
                          if (file) {
                            updatePrint(p.id, { artworkFiles: [file] as File[] })
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose file" /></SelectTrigger>
                        <SelectContent>
                          {artworkFiles.length === 0 ? (
                            <SelectItem value="__no_files__" disabled>No files uploaded</SelectItem>
                          ) : (
                            artworkFiles.map((f, i) => (
                              <SelectItem key={`${f.name}-${i}`} value={f.name}>{f.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          id={`print-upload-${p.id}`}
                          type="file"
                          accept="image/*,.png,.jpg,.jpeg,.svg,.pdf,.ai,.eps"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              updatePrint(p.id, { artworkFiles: [file] as File[] })
                            }
                            e.currentTarget.value = ''
                          }}
                        />
                        <Label htmlFor={`print-upload-${p.id}`} className="inline-flex">
                          <Button asChild variant="outline" size="sm">
                            <span className="inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</span>
                          </Button>
                        </Label>
                        <Button variant="ghost" size="sm" onClick={() => updatePrint(p.id, { artworkFiles: [] })}>Clear</Button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs">Text (optional)</Label>
                      <Input value={p.customText || ''} onChange={(e) => updatePrint(p.id, { customText: e.target.value })} placeholder="Custom text for this placement" />
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => updatePrint(p.id, { active: !p.active })} aria-label="Toggle visibility">
                        {p.active ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => duplicatePrint(p.id)} disabled={prints.length >= 4} aria-label="Duplicate">
                        <Copy className="w-4 h-4"/>
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePrint(p.id)} aria-label="Remove">
                        <Trash2 className="w-4 h-4 text-destructive"/>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Text */}
        <div className="space-y-3">
          <Label>Custom Text (Optional)</Label>
          <Input value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Enter text to be printed" />
        </div>

        {/* Special Instructions */}
        <div className="space-y-3">
          <Label>Special Instructions</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requirements or notes..." className="min-h-[100px]" />
        </div>
      </div>

      {/* Right: Visual + Specs + Summary */}
      <div className="space-y-6">
        {/* Mockup Viewer */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Images className="w-4 h-4"/> Mockup Viewer</div>
            <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
              <TabsList>
                <TabsTrigger value="front">Front</TabsTrigger>
                <TabsTrigger value="back">Back</TabsTrigger>
                <TabsTrigger value="sleeve">Sleeve</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="bg-muted/30 rounded-md">
            <AspectRatio ratio={1}>
              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <div ref={viewerRef} className="relative select-none" style={{ transform: `scale(${zoom})` }}
                  onMouseMove={(e) => {
                    // store latest mouse and schedule one RAF update to reduce jitter
                    pendingEvent.current = { x: e.clientX, y: e.clientY }
                    if (rafId.current != null) return
                    rafId.current = requestAnimationFrame(() => {
                      rafId.current = null
                      const ev = pendingEvent.current
                      if (!ev || !viewerRef.current) return
                      const rect = viewerRef.current.getBoundingClientRect()
                      const cx = ev.x - rect.left
                      const cy = ev.y - rect.top
                      const cxPct = (cx / rect.width) * 100
                      const cyPct = (cy / rect.height) * 100
                      // normalize within bounds box to -1..1
                      const nx = ((cxPct - (bounds.left + bounds.width / 2)) / (bounds.width / 2))
                      const ny = ((cyPct - (bounds.top + bounds.height / 2)) / (bounds.height / 2))
                      const clampedX = Math.max(-1, Math.min(1, nx))
                      const clampedY = Math.max(-1, Math.min(1, ny))

                      // dragging position
                      if (dragging) {
                        updatePrint(dragging.id, { position: { x: clampedX, y: clampedY } })
                        return
                      }

                      // rotating (snap to 5 degrees)
                      if (rotating) {
                        const p = prints.find(pr => pr.id === rotating.id)
                        if (!p) return
                        // compute overlay center in pixels from bounds + normalized position
                        const leftPct = bounds.left + bounds.width * (0.5 + (p.position.x || 0) * 0.5)
                        const topPct = bounds.top + bounds.height * (0.5 + (p.position.y || 0) * 0.5)
                        const centerX = rect.left + rect.width * (leftPct / 100)
                        const centerY = rect.top + rect.height * (topPct / 100)
                        const angleRad = Math.atan2(ev.y - centerY, ev.x - centerX)
                        const angleDeg = angleRad * (180 / Math.PI)
                        const snapped = Math.round(Math.round(angleDeg) / 5) * 5
                        updatePrint(rotating.id, { rotationDeg: snapped })
                        return
                      }

                      // resizing
                      if (resizing) {
                        const p = prints.find(pr => pr.id === resizing.id)
                        if (!p) return
                        const prev = lastMouse.current || { x: ev.x, y: ev.y }
                        const dxPx = ev.x - prev.x
                        const dyPx = ev.y - prev.y
                        lastMouse.current = { x: ev.x, y: ev.y }
                        const dxPct = (dxPx / rect.width) * 100
                        const dyPct = (dyPx / rect.height) * 100
                        const baseW = 12
                        const baseH = 16
                        const scalePct = 60
                        let newW = p.size.widthIn
                        let newH = p.size.heightIn
                        const corner = resizing.corner
                        const signX = corner.includes('e') ? 1 : -1
                        const signY = corner.includes('s') ? 1 : -1
                        newW = Math.max(1, Math.min(20, newW + (baseW * (dxPct * signX) / scalePct)))
                        newH = Math.max(1, Math.min(24, newH + (baseH * (dyPct * signY) / scalePct)))
                        // Prevent oversizing beyond bounds: recompute style and shrink if needed
                        const temp = { ...p, size: { ...p.size, widthIn: newW, heightIn: newH } }
                        const styled = overlayStyleFor(temp as any, bounds)
                        const wPct = parseFloat(styled.width as string)
                        const hPct = parseFloat(styled.height as string)
                        if (wPct > bounds.width) newW = (bounds.width / 60) * baseW
                        if (hPct > bounds.height) newH = (bounds.height / 60) * baseH
                        updatePrint(resizing.id, { size: { ...p.size, widthIn: newW, heightIn: newH } })
                      }
                    })
                  }}
                  onMouseUp={() => { setDragging(null); setResizing(null); setRotating(null); lastMouse.current = null }}
                  onMouseLeave={() => { setDragging(null); setResizing(null); setRotating(null); lastMouse.current = null }}
                >
                  {/* Garment mockup with true side sleeve view */}
                  <GarmentMockup type={garmentType} view={selectedView} color={colorSwatches[selectedBaseColor]} />
                  {/* Print overlays for current view */}
                  {prints.filter(p => matchView(p.location, selectedView)).filter(p => p.active).map((p) => (
                    <div
                      key={p.id}
                      className="absolute text-[10px] text-foreground cursor-move group"
                      style={overlayStyleFor(p, bounds)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setDragging({ id: p.id })
                      }}
                      onDragOver={(e) => { e.preventDefault() }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const file = e.dataTransfer.files?.[0]
                        if (file) {
                          updatePrint(p.id, { artworkFiles: [file] as File[] })
                        }
                      }}
                    >
                      {/* Rotated content (image/text). Border hugs the rendered image bounds. Handles are inside this rotated box. */}
                      <div className="w-full h-full flex items-center justify-center" style={{ transform: `rotate(${p.rotationDeg ?? 0}deg)` }}>
                        {(() => {
                          const f = Array.isArray(p.artworkFiles) && p.artworkFiles[0]
                          const ar = artworkAspect[p.id] // w/h
                          // Compute fitted box within the overlay (100%x100%)
                          const fitStyle = (() => {
                            if (!ar || ar <= 0) return { width: '100%', height: '100%' } as const
                            if (ar >= 1) {
                              // wider than tall: full width, scaled height
                              const h = Math.min(100, 100 / ar)
                              return { width: '100%', height: `${h}%` } as const
                            } else {
                              // taller than wide: full height, scaled width
                              const w = Math.min(100, 100 * ar)
                              return { width: `${w}%`, height: '100%' } as const
                            }
                          })()
                          if (f instanceof File) {
                            const key = `${p.id}::${f.name}::${f.lastModified}::${f.size}`
                            const url = urlCache.current[key] || (urlCache.current[key] = URL.createObjectURL(f))
                            return (
                              <div className="relative flex items-center justify-center border-2 border-primary/70 border-dashed bg-primary/10 rounded-sm" style={fitStyle}>
                                <img
                                  src={url}
                                  alt="artwork"
                                  className="pointer-events-none block w-full h-full object-contain rounded-sm"
                                  onLoad={(e) => {
                                    const img = e.currentTarget
                                    const w = img.naturalWidth || 0
                                    const h = img.naturalHeight || 1
                                    if (w && h) {
                                      const next = w / h
                                      setArtworkAspect(prev => (prev[p.id] === next ? prev : { ...prev, [p.id]: next }))
                                    }
                                  }}
                                />
                                {/* Resize handles (inside rotated box) */}
                                {(['nw','ne','sw','se'] as const).map((corner) => (
                                  <div
                                    key={corner}
                                    className={`absolute w-3.5 h-3.5 bg-white rounded-sm border-2 border-primary shadow-sm ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' } ${corner === 'nw' ? 'top-[-7px] left-[-7px]' : ''} ${corner === 'ne' ? 'top-[-7px] right-[-7px]' : ''} ${corner === 'sw' ? 'bottom-[-7px] left-[-7px]' : ''} ${corner === 'se' ? 'bottom-[-7px] right-[-7px]' : ''}`}
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizing({ id: p.id, corner }); lastMouse.current = { x: e.clientX, y: e.clientY } }}
                                  />
                                ))}
                                {/* Rotation handle and angle badge (top-center) */}
                                <div className={`absolute left-1/2 -translate-x-1/2 -top-7 h-5 w-px bg-primary/70 ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`} />
                                <div
                                  className={`absolute left-1/2 -translate-x-1/2 -top-9 w-4 h-4 bg-white rounded-full border-2 border-primary shadow-sm cursor-crosshair ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`}
                                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setRotating({ id: p.id }) }}
                                  title="Rotate"
                                />
                                <div className={`absolute left-1/2 -translate-x-1/2 -top-12 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`}>
                                  {Math.round((p.rotationDeg ?? 0) / 5) * 5}°
                                </div>
                              </div>
                            )
                          }
                          if (typeof f === 'string' && f) {
                            return (
                              <div className="relative flex items-center justify-center border-2 border-primary/70 border-dashed bg-primary/10 rounded-sm" style={fitStyle}>
                                <img
                                  src={f}
                                  alt="artwork"
                                  className="pointer-events-none block w-full h-full object-contain rounded-sm"
                                  onLoad={(e) => {
                                    const img = e.currentTarget
                                    const w = img.naturalWidth || 0
                                    const h = img.naturalHeight || 1
                                    if (w && h) {
                                      const next = w / h
                                      setArtworkAspect(prev => (prev[p.id] === next ? prev : { ...prev, [p.id]: next }))
                                    }
                                  }}
                                />
                                {(['nw','ne','sw','se'] as const).map((corner) => (
                                  <div
                                    key={corner}
                                    className={`absolute w-3.5 h-3.5 bg-white rounded-sm border-2 border-primary shadow-sm ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' } ${corner === 'nw' ? 'top-[-7px] left-[-7px]' : ''} ${corner === 'ne' ? 'top-[-7px] right-[-7px]' : ''} ${corner === 'sw' ? 'bottom-[-7px] left-[-7px]' : ''} ${corner === 'se' ? 'bottom-[-7px] right-[-7px]' : ''}`}
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizing({ id: p.id, corner }); lastMouse.current = { x: e.clientX, y: e.clientY } }}
                                  />
                                ))}
                                <div className={`absolute left-1/2 -translate-x-1/2 -top-7 h-5 w-px bg-primary/70 ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`} />
                                <div
                                  className={`absolute left-1/2 -translate-x-1/2 -top-9 w-4 h-4 bg-white rounded-full border-2 border-primary shadow-sm cursor-crosshair ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`}
                                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setRotating({ id: p.id }) }}
                                  title="Rotate"
                                />
                                <div className={`absolute left-1/2 -translate-x-1/2 -top-12 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`}>
                                  {Math.round((p.rotationDeg ?? 0) / 5) * 5}°
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div className="relative w-full h-full flex items-center justify-center border-2 border-primary/70 border-dashed bg-primary/10 rounded-sm">
                              <span className="px-1 text-[10px] text-foreground/80">{p.location} • {p.method} • {p.size.widthIn}x{p.size.heightIn}in</span>
                              {(['nw','ne','sw','se'] as const).map((corner) => (
                                <div
                                  key={corner}
                                  className={`absolute w-3.5 h-3.5 bg-white rounded-sm border-2 border-primary shadow-sm ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' } ${corner === 'nw' ? 'top-[-7px] left-[-7px]' : ''} ${corner === 'ne' ? 'top-[-7px] right-[-7px]' : ''} ${corner === 'sw' ? 'bottom-[-7px] left-[-7px]' : ''} ${corner === 'se' ? 'bottom-[-7px] right-[-7px]' : ''}`}
                                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizing({ id: p.id, corner }); lastMouse.current = { x: e.clientX, y: e.clientY } }}
                                />
                              ))}
                              <div className={`absolute left-1/2 -translate-x-1/2 -top-7 h-5 w-px bg-primary/70 ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`} />
                              <div
                                className={`absolute left-1/2 -translate-x-1/2 -top-9 w-4 h-4 bg-white rounded-full border-2 border-primary shadow-sm cursor-crosshair ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`}
                                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setRotating({ id: p.id }) }}
                                title="Rotate"
                              />
                              <div className={`absolute left-1/2 -translate-x-1/2 -top-12 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium ${ (resizing?.id===p.id || rotating?.id===p.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100' }`}>
                                {Math.round((p.rotationDeg ?? 0) / 5) * 5}°
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </AspectRatio>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} aria-label="Zoom out"><ZoomOut className="w-4 h-4"/></Button>
            <Slider value={[zoom]} onValueChange={(v) => setZoom(Number(v[0]))} min={0.5} max={2} step={0.1} className="w-40" />
            <Button type="button" variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))} aria-label="Zoom in"><ZoomIn className="w-4 h-4"/></Button>
            <div className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</div>
          </div>
        </div>

        {/* Material Specifications */}
        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Material Specifications</h3>
          <ScrollArea className="max-h-36">
            <ul className="list-disc pl-5 text-sm space-y-1">
              {(selectedProduct ? ['Premium fabric', 'Durable stitching', 'Soft feel', 'True-to-size'] : ['Select a product to see specs']).map((spec, i) => (
                <li key={i}>{spec}</li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        {/* Pricing Summary */}
        <div className="bg-card-secondary rounded-lg p-6">
          <h3 className="font-medium text-foreground mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Product:</span><span>{selectedProduct ? products[selectedProduct as keyof typeof products].name : 'None selected'}</span></div>
            <div className="flex justify-between"><span>Quantity:</span><span>{quantity} pieces</span></div>
            <div className="flex justify-between"><span>Print Colors:</span><span>{selectedColors.length} selected</span></div>
            <div className="flex justify-between"><span>Sizes:</span><span>{Object.values(sizesQty).reduce((a,b)=>a+(b||0),0)} total</span></div>
          </div>
          <div className="border-t border-primary/10 pt-4 mt-4">
            <div className="flex justify-between text-lg font-medium"><span>Total:</span><span>${price.toFixed(2)}</span></div>
            <div className="text-xs text-muted-foreground mt-1">${(price / Math.max(1, quantity)).toFixed(2)} per piece</div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">💡 40% deposit required • 60% before shipping</div>
          <div className="mt-4 space-y-2">
            {user ? (
              <>
                <Button onClick={handleCreateOrder} className="w-full" size="lg">Order</Button>
              </>
            ) : (
              <>
                <GuestDetailsDialog
                  trigger={<Button className="w-full" size="lg">Continue as Guest</Button>}
                  title="Continue as Guest"
                  description="Save your configuration and receive your quote by email. No account required."
                  onSubmitted={async () => {
                    const selectedSizes = Object.entries(sizesQty).filter(([, q]) => (q || 0) > 0).map(([s]) => s)
                    if (!selectedProduct || selectedColors.length === 0 || selectedSizes.length === 0) {
                      return toast.error('Please complete required selections before continuing as guest')
                    }
                    try {
                      const payload = {
                        type: 'quote',
                        info: info || {},
                        address: address || {},
                        draft: {
                          product_type: selectedProduct,
                          colors: selectedColors,
                          sizes: sizesQty,
                          customization_prints: prints.map(p => ({ id: p.id, location: p.location, method: p.method, colors: p.colors, colorCount: p.colorCount, size: p.size, position: p.position, rotationDeg: p.rotationDeg, customText: p.customText, notes: p.notes })),
                          artwork_files: artworkFiles.map(f => f.name),
                          custom_text: customText,
                          notes,
                          quantity,
                        },
                        totals: { total: price },
                        pricing: { quantity, customization, prints: prints.map(p => ({ id: p.id, location: p.location, method: p.method, colorCount: p.colorCount, size: p.size })), unit_price: price / Math.max(1, quantity), total: price },
                      }
                      const { error } = await supabase.from('guest_drafts').insert(payload)
                      if (error) throw error
                      // Try to send email (no-op if no key)
                      await sendGuestDraftEmail('quote', info?.email, payload)
                      toast.success('Guest quote saved. We\'ll email you shortly.')
                      setConfirmOpen(true)
                    } catch (e: unknown) {
                      console.error(e)
                      const message = e instanceof Error ? e.message : 'Failed to save guest quote'
                      toast.error(message)
                    }
                  }}
                />
                <AuthDialog 
                  trigger={<Button variant="outline" className="w-full" size="lg">Sign In to Continue</Button>} 
                  defaultTab="signup"
                />
              </>
            )}
            <Button variant="outline" className="w-full">Save as Draft</Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (mode === 'page') {
    return (
      <div className="space-y-6">
        {/* Uploader at top for convenience */}
        <div className="space-y-3">
          <Label>Artwork Upload</Label>
          <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">Upload Your Design Files</p>
            <p className="text-xs text-muted-foreground mb-3">JPG, PNG, PDF, AI, EPS files up to 5MB each</p>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.ai,.eps" onChange={handleFileUpload} className="hidden" id="file-upload" />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">Choose Files</label>
            </Button>
          </div>
          {artworkFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files</Label>
              {artworkFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2"><FileText className="w-4 h-4" /><span className="text-sm">{file.name}</span></div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {Content}
      </div>
    )
  }

  return (
    <>
      <Button variant="hero" size="lg" onClick={() => navigate('/customize')}>
        <Calculator className="w-4 h-4" />
        Customize Product
      </Button>

      {/* Confirmation CTA to create account */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quote Requested</DialogTitle>
            <DialogDescription>
              We saved your request and will follow up by email. Create an account to track status and manage orders.
            </DialogDescription>
          </DialogHeader>
          <AuthDialog 
            trigger={<Button className="w-full">Create Account to Track</Button>} 
            defaultTab="signup" 
          />
          <Button variant="outline" className="w-full" onClick={() => setConfirmOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ProductCustomizer