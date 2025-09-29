import api from '@/lib/api'

export async function uploadFile(file: File, opts?: {
  orderId?: string
  bookingId?: string
  filePurpose?: string
}): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  if (opts?.orderId) form.append('orderId', opts.orderId)
  if (opts?.bookingId) form.append('bookingId', opts.bookingId)
  form.append('filePurpose', opts?.filePurpose || 'reference')

  const { data } = await api.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  // API returns { fileUrl } as a relative path like "/api/uploads/<file>".
  // Normalize to absolute so consumers don't depend on current origin (e.g., 8081 vs 4000).
  const rel = (data?.fileUrl || '') as string
  const base = String(api.defaults.baseURL || '')
  const origin = base.replace(/\/?api\/?$/, '')
  const absolute = /^https?:\/\//i.test(rel) ? rel : `${origin}${rel}`
  return absolute
}
