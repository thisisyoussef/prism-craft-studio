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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {sizes.map((size) => (
        <div key={size} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-background">
          <span className="text-sm font-medium">{size}</span>
          <div className="inline-flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onDec(size)}>-</Button>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={quantities[size] ?? 0}
              onChange={(e) => onChange(size, parseInt(e.target.value || '0'))}
              className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onInc(size)}>+</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
