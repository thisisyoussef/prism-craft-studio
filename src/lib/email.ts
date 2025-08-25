// Lightweight email helper for the browser. Sends via server-side Edge Function to avoid leaking secrets.
// Actual email sending occurs in `supabase/functions/send-email/` using RESEND_API_KEY stored server-side.
import { supabase } from '@/integrations/supabase/client'
const RESEND_FROM = import.meta.env.VITE_RESEND_EMAIL

export async function sendGuestDraftEmail(type: 'quote' | 'sample', to: string | undefined, payload: any) {
  if (!to) return
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { type, to, payload },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    if (error) throw error
  } catch (e) {
    // Log preview to help debug in dev; avoid failing UX if email fails
    console.warn('[email] Failed to send via Edge Function. Preview below.', e)
    console.info('[email] preview', {
      to,
      type,
      from: RESEND_FROM ? `PTRN <${RESEND_FROM}>` : 'PTRN <notifications@ptrn.example>',
      preview: renderGuestDraftHtml(type, payload).slice(0, 2000),
    })
  }
}

function renderGuestDraftHtml(type: 'quote' | 'sample', payload: any) {
  const intro = type === 'quote' ? 'Thanks for your quote request!' : 'Thanks for your sample order request!'
  const items = Array.isArray(payload?.draft?.items)
    ? payload.draft.items
    : payload?.items || []

  return `
  <div style="font-family:Inter,system-ui,Arial,sans-serif">
    <h2>${intro}</h2>
    <p>We'll review details and follow up shortly.</p>
    <h3>Summary</h3>
    <pre style="background:#f6f6f7;padding:12px;border-radius:8px;white-space:pre-wrap">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
    <p style="color:#6b7280">If you didn't submit this, please ignore this email.</p>
  </div>
  `
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
