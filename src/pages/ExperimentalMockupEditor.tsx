import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Image as ImageIcon, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";

type ViewAngle = 'front' | 'back' | 'sleeve'

interface ProductRow { id: string; name: string; category: string | null }
interface VariantRow {
	id: string
	product_id?: string
	color_name: string
	color_hex?: string | null
	front_image_url?: string | null
	back_image_url?: string | null
	sleeve_image_url?: string | null
	active?: boolean
}

type PrintableBounds = { leftPct: number; topPct: number; widthPct: number; heightPct: number }

function getPrintableBounds(category: string | null, angle: ViewAngle): PrintableBounds {
	const cat = (category || '').toLowerCase()
	const isHoodie = cat.includes('hoodie')
	const isPolo = cat.includes('polo')
	const isSweat = cat.includes('sweat')
	if (angle === 'sleeve') return { leftPct: 32, topPct: 44, widthPct: 40, heightPct: 22 }
	if (isHoodie) return angle === 'front' ? { leftPct: 28, topPct: 28, widthPct: 44, heightPct: 54 } : { leftPct: 28, topPct: 30, widthPct: 44, heightPct: 56 }
	if (isPolo) return angle === 'front' ? { leftPct: 30, topPct: 28, widthPct: 40, heightPct: 52 } : { leftPct: 30, topPct: 30, widthPct: 40, heightPct: 54 }
	if (isSweat) return angle === 'front' ? { leftPct: 26, topPct: 30, widthPct: 48, heightPct: 54 } : { leftPct: 26, topPct: 32, widthPct: 48, heightPct: 56 }
	return angle === 'front' ? { leftPct: 28, topPct: 26, widthPct: 44, heightPct: 56 } : { leftPct: 28, topPct: 28, widthPct: 44, heightPct: 58 }
}

type Placement = {
	widthIn: number
	heightIn: number
	position: { x: number; y: number } // -1..1 relative
	rotationDeg: number
}

type LogoAsset = { id: string; url: string; aspect: number }

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

function computeOverlayStyle(placement: Placement, bounds: PrintableBounds) {
	const baseW = 12
	const baseH = 16
	const widthPct = clamp((placement.widthIn / baseW) * 60, 5, bounds.widthPct)
	const heightPct = clamp((placement.heightIn / baseH) * 60, 5, bounds.heightPct)
	const x = typeof placement.position.x === 'number' ? placement.position.x : 0
	const y = typeof placement.position.y === 'number' ? placement.position.y : 0
	let left = bounds.leftPct + (bounds.widthPct * (0.5 + x * 0.5)) - widthPct / 2
	let top = bounds.topPct + (bounds.heightPct * (0.5 + y * 0.5)) - heightPct / 2
	left = clamp(left, bounds.leftPct, bounds.leftPct + bounds.widthPct - widthPct)
	top = clamp(top, bounds.topPct, bounds.topPct + bounds.heightPct - heightPct)
	return { left: `${left}%`, top: `${top}%`, width: `${widthPct}%`, height: `${heightPct}%`, transform: `rotate(${placement.rotationDeg || 0}deg)` }
}

function inchesFromCm(cm: number) { return cm / 2.54 }

const presetPositions = {
	leftChest: { x: -0.45, y: -0.2 },
	rightChest: { x: 0.45, y: -0.2 },
	centerChest: { x: 0, y: -0.1 },
	fullFront: { x: 0, y: 0 },
	upperBack: { x: 0, y: -0.3 },
	centerBack: { x: 0, y: -0.05 },
}

const ExperimentalMockupEditor = () => {
	const [products, setProducts] = useState<ProductRow[]>([])
	const [productId, setProductId] = useState<string>('')
	const [productCategory, setProductCategory] = useState<string | null>(null)
	const [variants, setVariants] = useState<VariantRow[]>([])
	const [color, setColor] = useState<string>('')
	const [angle, setAngle] = useState<ViewAngle>('front')
	const [baseUrl, setBaseUrl] = useState<string>('')
	const [logo, setLogo] = useState<LogoAsset | null>(null)
	const [placement, setPlacement] = useState<Placement>({ widthIn: 6, heightIn: 6, position: { x: 0, y: 0 }, rotationDeg: 0 })
	const [chatInput, setChatInput] = useState<string>('')
	const [variantThumbs, setVariantThumbs] = useState<{ color: string; dataUrl: string }[]>([])
	const previewRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		;(async () => {
			try {
				const { data, error } = await (supabase as any)
					.from('products')
					.select('id, name, category')
					.order('name', { ascending: true })
				if (!error && Array.isArray(data)) {
					setProducts(data as ProductRow[])
					if (!productId && (data as ProductRow[]).length) {
						const first = (data as ProductRow[])[0]!
						setProductId(first.id)
						setProductCategory(first.category || null)
					}
				}
			} catch {}
		})()
	}, [])

	useEffect(() => {
		if (!productId) { setVariants([]); return }
		;(async () => {
			try {
				const { data, error } = await (supabase as any)
					.from('product_variants')
					.select('id, product_id, color_name, color_hex, front_image_url, back_image_url, sleeve_image_url, active')
					.eq('product_id', productId)
					.order('color_name', { ascending: true })
				if (!error && Array.isArray(data)) {
					const actives = (data as VariantRow[]).filter(v => v.active !== false)
					setVariants(actives)
					if (actives.length) setColor(actives[0]!.color_name)
				}
			} catch {}
		})()
	}, [productId])

	const colorSwatches = useMemo(() => {
		return Object.fromEntries(variants.map(v => [v.color_name, v.color_hex || '#ffffff'])) as Record<string, string>
	}, [variants])

	useEffect(() => {
		const variant = variants.find(v => (v.color_name || '').toLowerCase() === (color || '').toLowerCase())
		if (!variant) { setBaseUrl(''); return }
		const url = angle === 'front' ? (variant.front_image_url || '') : angle === 'back' ? (variant.back_image_url || '') : (variant.sleeve_image_url || '')
		setBaseUrl(url || '')
	}, [variants, color, angle])

	const bounds = useMemo(() => getPrintableBounds(productCategory || null, angle), [productCategory, angle])
	const overlayStyle = useMemo(() => computeOverlayStyle(placement, bounds), [placement, bounds])

	const onUploadLogo = (file: File) => {
		const url = URL.createObjectURL(file)
		const img = new Image()
		img.onload = () => {
			const aspect = img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 1
			setLogo({ id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`, url, aspect })
		}
		img.src = url
	}

	const parseChatAndApply = (text: string) => {
		let t = text.toLowerCase()
		if (!t.trim()) return
		const colors = Object.keys(colorSwatches)
		const foundColor = colors.find(c => t.includes(c.toLowerCase()))
		if (foundColor) setColor(foundColor)
		if (t.includes('front')) setAngle('front')
		if (t.includes('back')) setAngle('back')
		if (t.includes('sleeve')) setAngle('sleeve')
		if (/(left chest|left crest)/.test(t)) setPlacement(p => ({ ...p, position: { ...presetPositions.leftChest } }))
		if (/(right chest)/.test(t)) setPlacement(p => ({ ...p, position: { ...presetPositions.rightChest } }))
		if (/(center chest|center front)/.test(t)) setPlacement(p => ({ ...p, position: { ...presetPositions.centerChest } }))
		if (/upper back/.test(t)) setPlacement(p => ({ ...p, position: { ...presetPositions.upperBack } }))
		if (/(full front|full print)/.test(t)) setPlacement(p => ({ ...p, position: { ...presetPositions.fullFront }, widthIn: 10, heightIn: 12 }))
		const widthMatch = t.match(/width\s*(\d+(?:\.\d+)?)\s*(cm|in|inch|inches)/)
		if (widthMatch) {
			const num = parseFloat(widthMatch[1]!)
			const unit = widthMatch[2]!
			const inches = /cm/.test(unit) ? inchesFromCm(num) : num
			setPlacement(p => ({ ...p, widthIn: clamp(inches, 1, 12) }))
		}
		if (/small crest/.test(t)) setPlacement(p => ({ ...p, widthIn: 3, heightIn: 3 }))
		if (/bigger|larger|increase/.test(t)) setPlacement(p => ({ ...p, widthIn: clamp(p.widthIn + 1, 1, 12), heightIn: clamp(p.heightIn + 1, 1, 16) }))
		if (/smaller|decrease/.test(t)) setPlacement(p => ({ ...p, widthIn: clamp(p.widthIn - 1, 1, 12), heightIn: clamp(p.heightIn - 1, 1, 16) }))
		const genMatch = t.match(/(generate|make|create)\s*(\d+)\s*colorways?/)
		if (genMatch) {
			const n = parseInt(genMatch[2] || '0')
			if (n > 0) generateVariantThumbs(Math.min(n, variants.length || 0))
		}
	}

	const generateVariantThumbs = async (count: number) => {
		const list = variants.slice(0, count)
		const out: { color: string; dataUrl: string }[] = []
		for (const v of list) {
			const url = angle === 'front' ? v.front_image_url : angle === 'back' ? v.back_image_url : v.sleeve_image_url
			if (!url) continue
			try {
				const dataUrl = await renderComposite(url, logo?.url || null, placement, bounds)
				out.push({ color: v.color_name, dataUrl })
			} catch {}
		}
		setVariantThumbs(out)
	}

	const exportPreview = async () => {
		if (!baseUrl) return
		try {
			const dataUrl = await renderComposite(baseUrl, logo?.url || null, placement, bounds, true)
			downloadDataUrl(dataUrl, 'mockup-preview.png')
			const spec = buildPlacementSpec()
			downloadBlob(new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' }), 'placement-spec.json')
		} catch (e) {
			console.error('Export failed', e)
		}
	}

	const buildPlacementSpec = () => {
		const variant = variants.find(v => (v.color_name || '').toLowerCase() === (color || '').toLowerCase())
		return {
			sessionId: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
			sku: productId,
			baseId: `${productId}_${angle}`,
			printAreas: [
				{ id: angle === 'front' ? 'front' : angle === 'back' ? 'back' : 'sleeve', x: bounds.leftPct / 100, y: bounds.topPct / 100, w: bounds.widthPct / 100, h: bounds.heightPct / 100, units: 'relative' }
			],
			assets: logo ? [
				{ id: logo.id, src: logo.url, targetAreaId: angle, scale: placement.widthIn / 10, offsetX: placement.position.x * 0.5, offsetY: placement.position.y * 0.5 }
			] : [],
			chatHistory: [],
			renders: [
				{ id: 'r1', imageUrl: baseUrl, variantColor: variant?.color_name || color }
			]
		}
	}

	return (
		<div className="relative min-h-screen bg-background">
			<Navigation />
			<div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
				<div className="mb-6 flex items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-medium text-foreground">Chat-First Mockup Editor</h1>
						<p className="text-muted-foreground mt-1">Experimental — catalog bases only; printable areas enforced.</p>
					</div>
					<Badge variant="secondary" className="inline-flex items-center gap-2">
						<FlaskConical className="h-3.5 w-3.5" />
						Experimental
					</Badge>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					<div className="lg:col-span-4 border rounded-lg">
						<div className="p-4 border-b">
							<h2 className="text-sm font-medium">Catalog</h2>
							<p className="text-xs text-muted-foreground">Pick a product and base angle.</p>
							<div className="mt-3 space-y-3">
								<div className="space-y-1">
									<Label className="text-xs">Product</Label>
									<Select value={productId} onValueChange={(v) => {
										setProductId(v)
										const p = products.find(pr => pr.id === v)
										setProductCategory(p?.category || null)
									}}>
										<SelectTrigger>
											<SelectValue placeholder="Select product" />
										</SelectTrigger>
										<SelectContent>
											{products.map(p => (
												<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">Color</Label>
									<Select value={color} onValueChange={(v) => setColor(v)}>
										<SelectTrigger>
											<SelectValue placeholder="Select color" />
										</SelectTrigger>
										<SelectContent>
											{Object.keys(colorSwatches).map(c => (
												<SelectItem key={c} value={c}>{c}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">Angle</Label>
									<div className="flex gap-2">
										<Button variant={angle==='front'?'default':'outline'} size="sm" onClick={() => setAngle('front')}>Front</Button>
										<Button variant={angle==='back'?'default':'outline'} size="sm" onClick={() => setAngle('back')}>Back</Button>
										<Button variant={angle==='sleeve'?'default':'outline'} size="sm" onClick={() => setAngle('sleeve')}>Sleeve</Button>
									</div>
								</div>
							</div>
						</div>
						<ScrollArea className="h-[340px]">
							<div className="p-4 grid grid-cols-2 gap-3">
								{variants.map(v => {
									const url = angle==='front'?v.front_image_url:angle==='back'?v.back_image_url:v.sleeve_image_url
									return (
										<button key={v.id} className={`aspect-square rounded-md border bg-muted/20 overflow-hidden relative ${((v.color_name||'').toLowerCase()===(color||'').toLowerCase())?'ring-2 ring-primary':''}`} onClick={() => setColor(v.color_name)}>
											{url ? (
												<img src={url} alt={v.color_name} className="w-full h-full object-cover" crossOrigin="anonymous" />
											) : (
												<div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
											)}
											<span className="absolute bottom-1 left-1 right-1 text-[10px] px-1 py-0.5 bg-background/80 rounded text-foreground truncate">{v.color_name}</span>
										</button>
									)
								})}
							</div>
						</ScrollArea>
					</div>

					<div className="lg:col-span-8">
						<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
							<div className="md:col-span-3 border rounded-lg p-4">
								<h3 className="text-sm font-medium mb-2">Preview</h3>
								<div ref={previewRef} className="relative aspect-[4/3] rounded-md border bg-muted/30 overflow-hidden">
									{baseUrl ? (
										<img src={baseUrl} alt="base" className="absolute inset-0 w-full h-full object-contain" crossOrigin="anonymous" />
									) : (
										<div className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
									)}
									{/* printable area */}
									<div className="absolute border-dashed border-2 border-primary/40 rounded-sm" style={{ left: `${bounds.leftPct}%`, top: `${bounds.topPct}%`, width: `${bounds.widthPct}%`, height: `${bounds.heightPct}%` }} />
									{logo && (
										<div className="absolute" style={overlayStyle as any}>
											<img src={logo.url} alt="logo" className="w-full h-full object-contain select-none pointer-events-none" crossOrigin="anonymous" />
										</div>
									)}
								</div>
								{variantThumbs.length ? (
									<div className="mt-3 grid grid-cols-6 gap-2">
										{variantThumbs.map((v) => (
											<div key={v.color} className="aspect-square rounded-md border overflow-hidden">
												<img src={v.dataUrl} alt={v.color} className="w-full h-full object-cover" />
											</div>
										))}
									</div>
								) : null}
							</div>
							<div className="md:col-span-2 border rounded-lg p-0">
								<Tabs defaultValue="chat" className="w-full">
									<div className="p-3 border-b">
										<TabsList className="w-full">
											<TabsTrigger value="chat" className="w-1/2">Chat</TabsTrigger>
											<TabsTrigger value="draw" className="w-1/2">Draw</TabsTrigger>
										</TabsList>
									</div>
									<TabsContent value="chat" className="p-3">
										<div className="space-y-2 text-xs text-muted-foreground">
											<p>Try: “make the hoodie forest green; small crest on left chest; generate 6 colorways”.</p>
										</div>
										<div className="mt-2 flex gap-2">
											<Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Describe your edit" />
											<Button onClick={() => { parseChatAndApply(chatInput); setChatInput('') }}>Send</Button>
										</div>
										<div className="mt-4 grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<Label className="text-xs">Position X</Label>
												<Slider value={[placement.position.x]} min={-1} max={1} step={0.02} onValueChange={(v) => setPlacement(p => ({ ...p, position: { ...p.position, x: v[0]! } }))} />
											</div>
											<div className="space-y-1">
												<Label className="text-xs">Position Y</Label>
												<Slider value={[placement.position.y]} min={-1} max={1} step={0.02} onValueChange={(v) => setPlacement(p => ({ ...p, position: { ...p.position, y: v[0]! } }))} />
											</div>
											<div className="space-y-1">
												<Label className="text-xs">Width (in)</Label>
												<Slider value={[placement.widthIn]} min={1} max={12} step={0.25} onValueChange={(v) => setPlacement(p => ({ ...p, widthIn: v[0]! }))} />
											</div>
											<div className="space-y-1">
												<Label className="text-xs">Height (in)</Label>
												<Slider value={[placement.heightIn]} min={1} max={16} step={0.25} onValueChange={(v) => setPlacement(p => ({ ...p, heightIn: v[0]! }))} />
											</div>
										</div>
									</TabsContent>
									<TabsContent value="draw" className="p-3">
										<div className="space-y-2 text-xs text-muted-foreground">
											<p>Upload a rough logo or sketch. Enhance will clean edges and upscale.</p>
										</div>
										<div className="mt-3 space-y-2">
											<label className="flex items-center gap-2 text-sm">
												<input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadLogo(f) }} />
												<Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Upload</Button>
											</label>
											<div className="aspect-[4/3] rounded-md border bg-muted/30 grid place-items-center overflow-hidden">
												{logo ? (
													<img src={logo.url} className="max-h-full max-w-full" crossOrigin="anonymous" />
												) : (
													<div className="text-muted-foreground text-xs">No graphic uploaded</div>
												)}
											</div>
											<div className="flex gap-2">
												<Button onClick={() => logo && setLogo({ ...logo })}>Enhance</Button>
												<Button variant="outline" onClick={() => setLogo(null)}>Clear</Button>
											</div>
										</div>
									</TabsContent>
								</Tabs>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<Button variant="outline" onClick={exportPreview}>Export Preview & JSON</Button>
							<Button disabled>Add to Quote</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default ExperimentalMockupEditor

async function renderComposite(baseUrl: string, overlayUrl: string | null, placement: Placement, bounds: PrintableBounds, watermark = false): Promise<string> {
	const baseImg = await loadImage(baseUrl)
	const width = 1024
	const height = Math.round((baseImg.naturalHeight / baseImg.naturalWidth) * width)
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(baseImg, 0, 0, width, height)
	if (overlayUrl) {
		const ov = await loadImage(overlayUrl)
		const bx = bounds.leftPct / 100 * width
		const by = bounds.topPct / 100 * height
		const bw = bounds.widthPct / 100 * width
		const bh = bounds.heightPct / 100 * height
		const baseW = 12
		const baseH = 16
		const w = clamp((placement.widthIn / baseW) * 0.6 * width, 0.05 * bw, bw)
		const h = clamp((placement.heightIn / baseH) * 0.6 * height, 0.05 * bh, bh)
		const cx = bx + bw * (0.5 + placement.position.x * 0.5)
		const cy = by + bh * (0.5 + placement.position.y * 0.5)
		const left = clamp(cx - w / 2, bx, bx + bw - w)
		const top = clamp(cy - h / 2, by, by + bh - h)
		ctx.save()
		ctx.translate(left + w / 2, top + h / 2)
		ctx.rotate((placement.rotationDeg || 0) * Math.PI / 180)
		ctx.drawImage(ov, -w / 2, -h / 2, w, h)
		ctx.restore()
	}
	if (watermark) {
		ctx.save()
		ctx.globalAlpha = 0.08
		ctx.fillStyle = '#000'
		ctx.font = '12px sans-serif'
		ctx.fillText('rendered by experimental editor', width - 260, height - 12)
		ctx.restore()
	}
	return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}

function downloadDataUrl(dataUrl: string, filename: string) {
	const a = document.createElement('a')
	a.href = dataUrl
	a.download = filename
	a.click()
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	downloadDataUrl(url, filename)
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}

