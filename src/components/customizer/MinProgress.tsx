import React from 'react'
import { Progress } from '@/components/ui/progress'

interface MinProgressProps {
  total: number
  min?: number
}

export default function MinProgress({ total, min = 50 }: MinProgressProps) {
  const value = Math.min(100, Math.round((Math.max(0, total) / min) * 100))
  return (
    <div className="space-y-1">
      <Progress value={value} />
      <div className="text-xs text-muted-foreground">{Math.min(total, min)}/{min} minimum</div>
    </div>
  )
}
