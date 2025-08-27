import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ArtworkUploader from '@/components/customizer/ArtworkUploader'
import { Eye, EyeOff, Copy, Trash2 } from 'lucide-react'
import type { PrintPlacement, PrintLocation, PrintMethod } from '@/lib/store'

interface PlacementEditorProps {
  placement: PrintPlacement
  placements: string[]
  artworkFiles: File[]
  onUpdate: (id: string, patch: Partial<PrintPlacement>) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
}

export default function PlacementEditor({ placement: p, placements, artworkFiles, onUpdate, onDuplicate, onRemove }: PlacementEditorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-36">
        <Label className="text-xs">Location</Label>
        <Select value={p.location} onValueChange={(v) => onUpdate(p.id, { location: v as PrintLocation })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {placements.map(loc => (
              <SelectItem key={loc} value={loc}>{loc.replace('_',' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-44">
        <Label className="text-xs">Method</Label>
        <Select value={p.method} onValueChange={(v) => onUpdate(p.id, { method: v as PrintMethod })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="screen-print">screen-print</SelectItem>
            <SelectItem value="embroidery">embroidery</SelectItem>
            <SelectItem value="vinyl">vinyl</SelectItem>
            <SelectItem value="dtg">dtg</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-40">
        <Label className="text-xs">Size (W x H in)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} step={0.5} value={p.size.widthIn}
            onChange={(e) => onUpdate(p.id, { size: { ...p.size, widthIn: parseFloat(e.target.value || '0') } })} />
          <span className="text-muted-foreground">×</span>
          <Input type="number" min={1} step={0.5} value={p.size.heightIn}
            onChange={(e) => onUpdate(p.id, { size: { ...p.size, heightIn: parseFloat(e.target.value || '0') } })} />
        </div>
      </div>
      <div className="w-28">
        <Label className="text-xs">Colors</Label>
        <Input type="number" min={1} max={10} value={p.colorCount}
          onChange={(e) => onUpdate(p.id, { colorCount: Math.max(1, parseInt(e.target.value || '1')) })} />
      </div>
      <div className="w-40">
        <ArtworkUploader
          files={artworkFiles}
          valueName={(() => {
            const f = Array.isArray(p.artworkFiles) && p.artworkFiles[0]
            if (f instanceof File) return f.name
            if (typeof f === 'string' && f) return f
            return undefined
          })()}
          onSelectFileName={(val) => {
            const file = artworkFiles.find(f => f.name === val)
            if (file) onUpdate(p.id, { artworkFiles: [file] as File[] })
          }}
          onUpload={(file) => onUpdate(p.id, { artworkFiles: [file] as File[] })}
          onClear={() => onUpdate(p.id, { artworkFiles: [] })}
          inputId={`print-upload-${p.id}`}
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Label className="text-xs">Text (optional)</Label>
        <Input value={p.customText || ''} onChange={(e) => onUpdate(p.id, { customText: e.target.value })} placeholder="Custom text for this placement" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={() => onUpdate(p.id, { active: !p.active })} aria-label="Toggle visibility">
          {p.active ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onDuplicate(p.id)} aria-label="Duplicate">
          <Copy className="w-4 h-4"/>
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(p.id)} aria-label="Remove">
          <Trash2 className="w-4 h-4 text-destructive"/>
        </Button>
      </div>
    </div>
  )
}
