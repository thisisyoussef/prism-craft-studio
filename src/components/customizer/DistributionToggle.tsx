import React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type DistMode = 'proportional' | 'even' | 'skew'

interface DistributionToggleProps {
  value: DistMode
  onChange: (v: DistMode) => void
}

export default function DistributionToggle({ value, onChange }: DistributionToggleProps) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as DistMode)}>
      <ToggleGroupItem value="proportional" aria-label="Proportional">Prop</ToggleGroupItem>
      <ToggleGroupItem value="even" aria-label="Even">Even</ToggleGroupItem>
      <ToggleGroupItem value="skew" aria-label="S–XL Skew">S–XL</ToggleGroupItem>
    </ToggleGroup>
  )
}
