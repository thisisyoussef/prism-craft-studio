import React from 'react'

export type GarmentType = 't-shirt' | 'hoodie' | 'polo' | 'sweatshirt'
export type GarmentView = 'front' | 'back' | 'sleeve'

function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 300 300" className="w-full h-full" aria-hidden>
      <defs>
        <filter id="gm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000014" />
        </filter>
      </defs>
      {children}
    </svg>
  )
}

function Shirt({ view, color, stroke = '#0f172a' }: { view: GarmentView; color: string; stroke?: string }) {
  if (view === 'sleeve') {
    // True side sleeve close-up
    return (
      <Canvas>
        <g filter="url(#gm-shadow)">
          {/* Shoulder seam to cuff */}
          <path d="M80 80 C 120 85, 180 70, 220 60 L 235 65 C 240 70, 240 80, 238 88 L 218 165 C 214 180, 205 192, 192 200 C 170 214, 145 222, 120 225 L 98 227 C 90 228, 82 222, 80 214 Z" fill={color} stroke={stroke} strokeWidth={2} />
          {/* Cuff */}
          <path d="M190 198 C 210 196, 228 190, 238 184 L 240 192 C 224 204, 206 212, 186 214 Z" fill={color} stroke={stroke} strokeWidth={2} />
        </g>
      </Canvas>
    )
  }
  return (
    <Canvas>
      <g filter="url(#gm-shadow)">
        <path d="M85 80 C 100 65, 200 65, 215 80 L 235 110 C 240 118, 240 128, 235 135 L 225 148 L 225 240 C 225 252, 215 260, 200 262 L 100 262 C 85 260, 75 252, 75 240 L 75 148 L 65 135 C 60 128, 60 118, 65 110 Z" fill={color} stroke={stroke} strokeWidth={2} />
        {view === 'front' && (
          <path d="M115 80 C 130 90, 170 90, 185 80" fill="none" stroke={stroke} strokeWidth={2} />
        )}
        {view === 'back' && (
          <path d="M120 82 C 150 96, 150 96, 180 82" fill="none" stroke={stroke} strokeWidth={2} />
        )}
        <path d="M65 110 L 35 125 C 25 130, 22 145, 30 153 L 55 178 L 75 148" fill={color} stroke={stroke} strokeWidth={2} />
        <path d="M235 110 L 265 125 C 275 130, 278 145, 270 153 L 245 178 L 225 148" fill={color} stroke={stroke} strokeWidth={2} />
      </g>
    </Canvas>
  )
}

function Hoodie({ view, color, stroke = '#0f172a' }: { view: GarmentView; color: string; stroke?: string }) {
  if (view === 'sleeve') return Shirt({ view, color, stroke })
  return (
    <Canvas>
      <g filter="url(#gm-shadow)">
        {/* Body with pocket hint */}
        <path d="M80 90 C 105 65, 195 65, 220 90 L 235 120 L 235 240 C 235 255, 220 265, 205 268 L 95 268 C 80 265, 65 255, 65 240 L 65 120 Z" fill={color} stroke={stroke} strokeWidth={2} />
        {/* Hood */}
        <path d="M100 70 C 120 40, 180 40, 200 70 L 200 90 C 180 80, 120 80, 100 90 Z" fill={color} stroke={stroke} strokeWidth={2} />
        {/* Pocket lines */}
        {view === 'front' && (
          <path d="M110 205 C 130 220, 170 220, 190 205" fill="none" stroke={stroke} strokeWidth={2} />
        )}
        {/* Sleeves */}
        <path d="M65 120 L 35 140 L 60 190 L 80 155" fill={color} stroke={stroke} strokeWidth={2} />
        <path d="M235 120 L 265 140 L 240 190 L 220 155" fill={color} stroke={stroke} strokeWidth={2} />
      </g>
    </Canvas>
  )
}

function Polo({ view, color, stroke = '#0f172a' }: { view: GarmentView; color: string; stroke?: string }) {
  if (view === 'sleeve') return Shirt({ view, color, stroke })
  return (
    <Canvas>
      <g filter="url(#gm-shadow)">
        <path d="M85 85 C 105 70, 195 70, 215 85 L 230 110 L 230 240 C 230 252, 215 262, 200 265 L 100 265 C 85 262, 70 252, 70 240 L 70 110 Z" fill={color} stroke={stroke} strokeWidth={2} />
        {/* Collar with placket */}
        <path d="M120 85 L 180 85 L 175 105 C 160 110, 140 110, 125 105 Z" fill={color} stroke={stroke} strokeWidth={2} />
        <path d="M150 105 L 150 140" stroke={stroke} strokeWidth={2} />
        <circle cx="150" cy="120" r="2" fill={stroke} />
        <circle cx="150" cy="132" r="2" fill={stroke} />
        {/* Sleeves */}
        <path d="M70 110 L 40 130 L 62 170 L 78 145" fill={color} stroke={stroke} strokeWidth={2} />
        <path d="M230 110 L 260 130 L 238 170 L 222 145" fill={color} stroke={stroke} strokeWidth={2} />
      </g>
    </Canvas>
  )
}

function Sweatshirt({ view, color, stroke = '#0f172a' }: { view: GarmentView; color: string; stroke?: string }) {
  if (view === 'sleeve') return Shirt({ view, color, stroke })
  return (
    <Canvas>
      <g filter="url(#gm-shadow)">
        <path d="M85 88 C 105 70, 195 70, 215 88 L 230 115 L 230 240 C 230 255, 215 265, 200 268 L 100 268 C 85 265, 70 255, 70 240 L 70 115 Z" fill={color} stroke={stroke} strokeWidth={2} />
        {/* Rib cuffs/hem hints */}
        <path d="M90 268 L 210 268" stroke={stroke} strokeWidth={2} />
        <path d="M78 145 L 222 145" stroke={stroke} strokeWidth={1.5} opacity={0.5} />
        <path d="M70 115 L 40 135 L 62 175 L 78 150" fill={color} stroke={stroke} strokeWidth={2} />
        <path d="M230 115 L 260 135 L 238 175 L 222 150" fill={color} stroke={stroke} strokeWidth={2} />
      </g>
    </Canvas>
  )
}

export function GarmentMockup({ type, view, color }: { type: GarmentType; view: GarmentView; color: string }) {
  switch (type) {
    case 'hoodie':
      return <Hoodie view={view} color={color} />
    case 'polo':
      return <Polo view={view} color={color} />
    case 'sweatshirt':
      return <Sweatshirt view={view} color={color} />
    case 't-shirt':
    default:
      return <Shirt view={view} color={color} />
  }
}

export default GarmentMockup
