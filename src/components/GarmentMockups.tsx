import React from 'react'

export type GarmentType = 't-shirt' | 'hoodie' | 'polo' | 'sweatshirt'
export type GarmentView = 'front' | 'back' | 'sleeve'

type BaseImageProps = { baseUrl?: string }

function Canvas({ children, baseUrl }: { children?: React.ReactNode; baseUrl?: string }) {
  return (
    <svg viewBox="0 0 300 300" className="w-full h-full" aria-hidden>
      {baseUrl ? (
        <image href={baseUrl} x={0} y={0} width={300} height={300} preserveAspectRatio="xMidYMid meet" />
      ) : null}
      {children}
    </svg>
  )
}

function Shirt({ view, color, stroke = '#0f172a', baseUrl }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl}>
      {/* No SVG fallback; only the base image renders if provided */}
    </Canvas>
  )
}

function Hoodie({ view, color, stroke = '#0f172a', baseUrl }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl}>
      {/* No SVG fallback */}
    </Canvas>
  )
}

function Polo({ view, color, stroke = '#0f172a', baseUrl }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl}>
      {/* No SVG fallback */}
    </Canvas>
  )
}

function Sweatshirt({ view, color, stroke = '#0f172a', baseUrl }: { view: GarmentView; color: string; stroke?: string } & BaseImageProps) {
  return (
    <Canvas baseUrl={baseUrl}>
      {/* No SVG fallback */}
    </Canvas>
  )
}

export function GarmentMockup({ type, view, color, frontUrl, backUrl, sleeveUrl }: { type: GarmentType; view: GarmentView; color: string; frontUrl?: string; backUrl?: string; sleeveUrl?: string }) {
  const url = view === 'front' ? frontUrl : view === 'back' ? backUrl : sleeveUrl
  switch (type) {
    case 'hoodie':
      return <Hoodie view={view} color={color} baseUrl={url} />
    case 'polo':
      return <Polo view={view} color={color} baseUrl={url} />
    case 'sweatshirt':
      return <Sweatshirt view={view} color={color} baseUrl={url} />
    case 't-shirt':
    default:
      return <Shirt view={view} color={color} baseUrl={url} />
  }
}

export default GarmentMockup
