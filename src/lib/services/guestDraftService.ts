import api from '@/lib/api'

export type GuestDraftPayload = {
  type: 'quote' | 'sample'
  info?: Record<string, any>
  address?: Record<string, any>
  draft?: Record<string, any>
  totals?: Record<string, any>
  pricing?: Record<string, any>
  metadata?: Record<string, any>
}

export type GuestDraft = {
  id: string
  type: 'quote' | 'sample'
  info: Record<string, any>
  address: Record<string, any>
  draft: Record<string, any>
  totals: Record<string, any>
  pricing: Record<string, any>
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export async function createGuestDraft(payload: GuestDraftPayload): Promise<GuestDraft> {
  const { data } = await api.post('/guest-drafts', payload)
  return data as GuestDraft
}

export async function listGuestDrafts(params?: { email?: string; type?: 'quote' | 'sample'; limit?: number }): Promise<GuestDraft[]> {
  const { data } = await api.get('/guest-drafts', { params })
  return (Array.isArray(data) ? data : (data?.drafts || data || [])) as GuestDraft[]
}
