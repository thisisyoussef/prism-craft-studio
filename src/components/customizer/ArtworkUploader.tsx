import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload } from 'lucide-react'

interface ArtworkUploaderProps {
  files: File[]
  valueName?: string
  onSelectFileName: (name: string) => void
  onUpload: (file: File) => void
  onClear: () => void
  inputId?: string
}

export default function ArtworkUploader({ files, valueName, onSelectFileName, onUpload, onClear, inputId }: ArtworkUploaderProps) {
  const id = inputId || 'artwork-upload-input'
  return (
    <div>
      <Label className="text-xs">Artwork</Label>
      <Select value={valueName} onValueChange={onSelectFileName}>
        <SelectTrigger><SelectValue placeholder="Choose file" /></SelectTrigger>
        <SelectContent>
          {files.length === 0 ? (
            <SelectItem value="__no_files__" disabled>No files uploaded</SelectItem>
          ) : (
            files.map((f, i) => (
              <SelectItem key={`${f.name}-${i}`} value={f.name}>{f.name}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.svg,.pdf,.ai,.eps"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.currentTarget.value = ''
          }}
        />
        <Label htmlFor={id} className="inline-flex">
          <Button asChild variant="outline" size="sm">
            <span className="inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</span>
          </Button>
        </Label>
        <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
      </div>
    </div>
  )
}
