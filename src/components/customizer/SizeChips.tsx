import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SizeChipsProps {
  sizes: string[]
  quantities: Record<string, number>
  onChange: (size: string, qty: number) => void
  onInc: (size: string, step?: number) => void
  onDec: (size: string, step?: number) => void
}

export default function SizeChips({ sizes, quantities, onChange, onInc, onDec }: SizeChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => (
        <div key={size} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-background">
          <span className="text-xs font-medium">{size}</span>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDec(size)}>-</Button>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={quantities[size] ?? 0}
            onChange={(e) => onChange(size, parseInt(e.target.value || '0'))}
            className="h-7 w-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onInc(size)}>+</Button>
        </div>
      ))}
    </div>
  )
}
