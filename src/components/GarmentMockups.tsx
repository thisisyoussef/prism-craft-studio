import React, { useEffect, useMemo, useState } from 'react'

export type GarmentType = 't-shirt' | 'hoodie' | 'polo' | 'sweatshirt'
export type GarmentView = 'front' | 'back' | 'sleeve'

type BaseImageProps = { baseUrl?: string; onDimensions?: (w: number, h: number) => void; autoCrop?: boolean }

// Utilities adapted from AiMockupEditor for safe fetch and auto-crop
async function fetchImageDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

function computeAutoCrop(img: HTMLImageElement): { sx: number; sy: number; sw: number; sh: number } | null {
  const w = (img as any).naturalWidth || img.width
  const h = (img as any).naturalHeight || img.height
  if (!w || !h) return null
  const off = document.createElement('canvas')
  off.width = w; off.height = h
  const ictx = off.getContext('2d')
  if (!ictx) return null
  ictx.drawImage(img, 0, 0)
  let data: ImageData
  try { data = ictx.getImageData(0, 0, w, h) } catch { return null }
  const px = data.data
  // background as average of four corners
  const cors = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4]
  const bg = { r: 0, g: 0, b: 0, a: 0 }
  for (const i of cors) { bg.r += px[i]; bg.g += px[i + 1]; bg.b += px[i + 2]; bg.a += px[i + 3] }
  bg.r /= 4; bg.g /= 4; bg.b /= 4; bg.a /= 4
  const thresh = 18
  const alphaThresh = 8
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const a = px[i + 3]
      const dr = px[i] - bg.r, dg = px[i + 1] - bg.g, db = px[i + 2] - bg.b
      const dist = Math.sqrt(dr*dr + dg*dg + db*db)
      if (a > alphaThresh || dist > thresh) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return null
  const pad = Math.round(Math.max(w, h) * 0.02)
  const sx = Math.max(0, minX - pad)
  const sy = Math.max(0, minY - pad)
  const sw = Math.min(w - sx, (maxX - minX + 1) + pad * 2)
  const sh = Math.min(h - sy, (maxY - minY + 1) + pad * 2)
  const area = (sw * sh) / (w * h)
  if (area > 0.98) return null
  return { sx, sy, sw, sh }
}

function useProcessedImage(url?: string, autoCrop: boolean = true) {
  const [state, setState] = useState<{ dataUrl?: string; w: number; h: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!url) { if (!cancelled) setState(null); return }
      try {
        const dataUrl = await fetchImageDataUrl(url)
        const img = await loadImage(dataUrl)
        const crop = autoCrop ? computeAutoCrop(img) : null
        let outUrl = dataUrl
        let w = (img as any).naturalWidth || img.width || 300
        let h = (img as any).naturalHeight || img.height || 300
        if (crop) {
          const off = document.createElement('canvas')
          off.width = crop.sw; off.height = crop.sh
          const ctx = off.getContext('2d')
          if (ctx) {
            try {
              ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh)
              outUrl = off.toDataURL('image/png')
              w = crop.sw; h = crop.sh
            } catch {}
          }
        }
        if (!cancelled) setState({ dataUrl: outUrl, w, h })
      } catch {
        if (!cancelled) setState(null)
      }
    })()
    return () => { cancelled = true }
  }, [url, autoCrop])
  return state
}

function Canvas({ children, baseUrl, onDimensions, autoCrop = true }: { children?: React.ReactNode; baseUrl?: string; onDimensions?: (w: number, h: number) => void; autoCrop?: boolean }) {
  const processed = useProcessedImage(baseUrl, autoCrop)
  const { vw, vh, href } = useMemo(() => {
    const w = Math.max(1, processed?.w || 300)
    const h = Math.max(1, processed?.h || 300)
    return { vw: w, vh: h, href: processed?.dataUrl || baseUrl }
  }, [processed, baseUrl])

  useEffect(() => {
    if (processed && onDimensions) onDimensions(processed.w, processed.h)
  }, [processed, onDimensions])

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full h-full" aria-hidden>
      {href ? (
        <image href={href} x={0} y={0} width={vw} height={vh} preserveAspectRatio="xMidYMid meet" />
      ) : null}
      {children}
    </svg>
  )
}

function Shirt({ view, color, stroke = '#0f172a', baseUrl, onDimensions, autoCrop }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl} onDimensions={onDimensions} autoCrop={autoCrop}>
      {/* No SVG fallback; only the base image renders if provided */}
    </Canvas>
  )
}

function Hoodie({ view, color, stroke = '#0f172a', baseUrl, onDimensions, autoCrop }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl} onDimensions={onDimensions} autoCrop={autoCrop}>
      {/* No SVG fallback */}
    </Canvas>
  )
}

function Polo({ view, color, stroke = '#0f172a', baseUrl, onDimensions, autoCrop }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl} onDimensions={onDimensions} autoCrop={autoCrop}>
      {/* No SVG fallback */}
    </Canvas>
  )
}

function Sweatshirt({ view, color, stroke = '#0f172a', baseUrl, onDimensions, autoCrop }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl} onDimensions={onDimensions} autoCrop={autoCrop}>
      {/* No SVG fallback */}
    </Canvas>
  )
}

export function GarmentMockup({ type, view, color, frontUrl, backUrl, sleeveUrl, onDimensions, autoCrop = true }: { type: GarmentType; view: GarmentView; color: string; frontUrl?: string; backUrl?: string; sleeveUrl?: string; onDimensions?: (w: number, h: number) => void; autoCrop?: boolean }) {
  const url = view === 'front' ? frontUrl : view === 'back' ? backUrl : sleeveUrl
  switch (type) {
    case 'hoodie':
      return <Hoodie view={view} color={color} baseUrl={url} onDimensions={onDimensions} autoCrop={autoCrop} />
    case 'polo':
      return <Polo view={view} color={color} baseUrl={url} onDimensions={onDimensions} autoCrop={autoCrop} />
    case 'sweatshirt':
      return <Sweatshirt view={view} color={color} baseUrl={url} onDimensions={onDimensions} autoCrop={autoCrop} />
    case 't-shirt':
    default:
      return <Shirt view={view} color={color} baseUrl={url} onDimensions={onDimensions} autoCrop={autoCrop} />
  }
}

export default GarmentMockup
