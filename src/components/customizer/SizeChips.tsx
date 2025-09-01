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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {sizes.map((size) => (
        <div key={size} className="rounded-lg border p-3 bg-background">
          <div className="text-xs text-muted-foreground mb-1">{size}</div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onDec(size)}>-</Button>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={quantities[size] ?? 0}
              onChange={(e) => onChange(size, parseInt(e.target.value || '0'))}
              className="h-9 w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onInc(size)}>+</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
