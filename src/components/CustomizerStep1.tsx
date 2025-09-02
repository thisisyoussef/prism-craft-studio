import { useMemo, useState, useRef, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PlacementEditor from '@/components/customizer/PlacementEditor'
import { Slider } from '@/components/ui/slider'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { usePricingStore, type PrintPlacement, type PrintLocation, type PrintMethod } from '@/lib/store'
import { Upload, FileText, Images, Plus, ZoomIn, ZoomOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import GarmentMockup, { type GarmentType } from './GarmentMockups'

interface CustomizerStep1Props {
  onNext: () => void
  onDataChange?: (data: { selectedProduct: string; selectedColors: string[] }) => void
  designData?: { selectedProduct: string; selectedColors: string[] }
}

// Helper functions from original customizer
function matchView(location: PrintLocation, view: 'front' | 'back' | 'sleeve') {
  if (view === 'front') return location === 'front' || location === 'collar' || location === 'tag'
  if (view === 'back') return location === 'back' || location === 'collar' || location === 'tag'
  return location.includes('sleeve')
}

type Bounds = { left: number; top: number; width: number; height: number }
function getBounds(product: GarmentType, view: 'front' | 'back' | 'sleeve'): Bounds {
  if (view === 'sleeve') {
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

function overlayStyleFor(p: PrintPlacement, bounds: Bounds): CSSProperties {
  const baseW = 12
  const baseH = 16
  const widthPct = Math.min(bounds.width, Math.max(5, (p?.size?.widthIn ?? 6) / baseW * 60))
  const heightPct = Math.min(bounds.height, Math.max(5, (p?.size?.heightIn ?? 8) / baseH * 60))
  const x = typeof p?.position?.x === 'number' ? p.position.x : 0
  const y = typeof p?.position?.y === 'number' ? p.position.y : 0
  let left = bounds.left + (bounds.width * (0.5 + x * 0.5)) - widthPct / 2
  let top = bounds.top + (bounds.height * (0.5 + y * 0.5)) - heightPct / 2
  left = Math.max(bounds.left, Math.min(bounds.left + bounds.width - widthPct, left))
  top = Math.max(bounds.top, Math.min(bounds.top + bounds.height - heightPct, top))
  return { left: `${left}%`, top: `${top}%`, width: `${widthPct}%`, height: `${heightPct}%` }
}

const CustomizerStep1 = ({ onNext, onDataChange, designData }: CustomizerStep1Props) => {
  const [selectedProduct, setSelectedProduct] = useState(designData?.selectedProduct || '')
  const [selectedColors, setSelectedColors] = useState<string[]>(designData?.selectedColors || [])
  const [selectedBaseColor, setSelectedBaseColor] = useState<string>('White')
  const [selectedView, setSelectedView] = useState<'front' | 'back' | 'sleeve'>('front')
  const [zoom, setZoom] = useState<number>(1)
  const [artworkFiles, setArtworkFiles] = useState<File[]>([])

  const { customization, prints, addPrint, updatePrint, removePrint, duplicatePrint, updateProductType, updateCustomization } = usePricingStore()

  // Handle artwork file uploads from placement editor
  const handleArtworkUpload = (file: File) => {
    setArtworkFiles(prev => [...prev, file])
  }
  
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<{ id: string } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; corner: 'nw' | 'ne' | 'sw' | 'se' } | null>(null)
  const [rotating, setRotating] = useState<{ id: string } | null>(null)
  const lastMouse = useRef<{ x: number; y: number } | null>(null)
  const rafId = useRef<number | null>(null)
  const pendingEvent = useRef<{ x: number; y: number } | null>(null)
  const [artworkAspect, setArtworkAspect] = useState<Record<string, number>>({})
  const urlCache = useRef<Record<string, string>>({})

  // Products and Variants from Supabase
  interface ProductRow { id: string; name: string; base_price: number | null; category: string | null }
  const [products, setProducts] = useState<ProductRow[]>([])

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('products')
          .select('id, name, base_price, category')
          .order('name', { ascending: true })
        if (!error && Array.isArray(data)) setProducts(data as ProductRow[])
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!selectedProduct && products.length > 0) {
      const first = products[0]!
      setSelectedProduct(first.id)
      updateProductType(first.id)
    }
  }, [products, selectedProduct, updateProductType])

  interface Variant {
    id: string
    product_id?: string
    color_name: string
    color_hex?: string | null
    front_image_url?: string | null
    back_image_url?: string | null
    sleeve_image_url?: string | null
    active?: boolean
  }
  const [variants, setVariants] = useState<Variant[]>([])

  useEffect(() => {
    if (!selectedProduct) { setVariants([]); return }
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('product_variants')
          .select('id, color_name, color_hex, front_image_url, back_image_url, sleeve_image_url, active')
          .eq('product_id', selectedProduct)
        if (!error && Array.isArray(data)) {
          const vs = data as Variant[]
          setVariants(vs)
          const names = vs.map(v => v.color_name)
          if (!names.includes(selectedBaseColor) && names.length > 0) {
            setSelectedBaseColor(names[0]!)
          }
        }
      } catch {}
    })()
  }, [selectedProduct, selectedBaseColor])

  const selectedVariant = useMemo(() => {
    const name = (selectedBaseColor || '').toLowerCase()
    return variants.find(v => (v.color_name || '').toLowerCase() === name) || null
  }, [variants, selectedBaseColor])

  const productMap = useMemo(() => {
    const map: Record<string, { name: string; basePrice: number; category: string | null }> = {}
    products.forEach(p => { map[p.id] = { name: p.name, basePrice: p.base_price ?? 0, category: p.category } })
    return map
  }, [products])

  const colorSwatches: Record<string, string> = useMemo(() => {
    const entries = variants
      .filter(v => v.active !== false)
      .map(v => [v.color_name, v.color_hex || '#ffffff'] as const)
    return Object.fromEntries(entries)
  }, [variants])
  
  const colors = Object.keys(colorSwatches)
  const placements = ['front','back','left_sleeve','right_sleeve','collar','tag']

  const garmentType: GarmentType = useMemo(() => {
    const cat = (productMap[selectedProduct]?.category || '').toLowerCase()
    if (cat.includes('hoodie')) return 'hoodie'
    if (cat.includes('polo')) return 'polo'
    if (cat.includes('sweat')) return 'sweatshirt'
    return 't-shirt'
  }, [productMap, selectedProduct])
  
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
    const newColors = selectedColors.includes(color) 
      ? selectedColors.filter(c => c !== color) 
      : [...selectedColors, color]
    setSelectedColors(newColors)
    onDataChange?.({ selectedProduct, selectedColors: newColors })
  }

  const isDesignComplete = useMemo(() => {
    return Boolean(selectedProduct) && selectedColors.length > 0 && prints.length > 0
  }, [selectedProduct, selectedColors, prints])

  // Cleanup blob URLs
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
      Object.values(urlCache.current).forEach(u => { try { URL.revokeObjectURL(u) } catch {} })
      urlCache.current = {}
    }
  }, [prints])

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-medium text-foreground mb-2">Design your product</h1>
        <p className="text-muted-foreground">Choose your product, colors, and customize the design</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-8">
        {/* Left: Design Configuration */}
        <div className="space-y-6">

          {/* Product Selection */}
          <div className="space-y-3">
            <Label>Product type *</Label>
            <Select 
              value={selectedProduct} 
              onValueChange={(value) => {
                setSelectedProduct(value)
                updateProductType(value)
                onDataChange?.({ selectedProduct: value, selectedColors })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {typeof p.base_price === 'number' ? `- $${p.base_price}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Base Color Selection */}
          <div className="space-y-3">
            <Label>Garment base color</Label>
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
            <Label>Print colors * ({selectedColors.length} selected)</Label>
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
          </div>

          {/* Customization Method */}
          <div className="space-y-3">
            <Label>Print method</Label>
            <Select value={customization} onValueChange={updateCustomization}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screen-print">Screen printing</SelectItem>
                <SelectItem value="embroidery">Embroidery</SelectItem>
                <SelectItem value="vinyl">Vinyl transfer</SelectItem>
                <SelectItem value="dtg">Direct-to-garment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Print Placements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Print placements</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPrintForCurrentView} disabled={prints.length >= 4}>
                <Plus className="w-4 h-4 mr-1" /> Add print
              </Button>
            </div>
            {prints.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add up to 4 prints (front, back, sleeves, etc.)</p>
            ) : (
              <div className="space-y-3">
                {prints.map((p) => (
                  <div key={p.id} className="border rounded-lg p-3">
                    <PlacementEditor
                      placement={p}
                      placements={placements}
                      artworkFiles={artworkFiles}
                      onUpdate={(id, patch) => {
                        updatePrint(id, patch)
                        // If uploading a new file, add it to our files array
                        if (patch.artworkFiles && Array.isArray(patch.artworkFiles) && patch.artworkFiles[0] instanceof File) {
                          const file = patch.artworkFiles[0]
                          if (!artworkFiles.find(f => f.name === file.name && f.lastModified === file.lastModified)) {
                            setArtworkFiles(prev => [...prev, file])
                          }
                        }
                      }}
                      onDuplicate={duplicatePrint}
                      onRemove={removePrint}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Mockup Viewer */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Images className="w-4 h-4"/> Preview
              </div>
              <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
                <TabsList>
                  <TabsTrigger value="front">Front</TabsTrigger>
                  <TabsTrigger value="back">Back</TabsTrigger>
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
                    <GarmentMockup
                      type={garmentType}
                      view={selectedView}
                      color={colorSwatches[selectedBaseColor]}
                      frontUrl={selectedVariant?.front_image_url || undefined}
                      backUrl={selectedVariant?.back_image_url || undefined}
                      sleeveUrl={selectedVariant?.sleeve_image_url || undefined}
                    />
                    {/* Interactive Print overlays with drag/resize/rotate */}
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
              <Button type="button" variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}>
                <ZoomOut className="w-4 h-4"/>
              </Button>
              <Slider value={[zoom]} onValueChange={(v) => setZoom(Number(v[0]))} min={0.5} max={2} step={0.1} className="w-40" />
              <Button type="button" variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}>
                <ZoomIn className="w-4 h-4"/>
              </Button>
              <div className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t">
        <Button 
          onClick={onNext} 
          disabled={!isDesignComplete}
          size="lg"
        >
          Continue to order details
        </Button>
      </div>
    </div>
  )
}

export default CustomizerStep1
