// Lightweight Resend wrapper. If RESEND_API_KEY is not present, we noop.
// You can set RESEND_API_KEY in .env and we will send real emails.
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
const RESEND_FROM = import.meta.env.VITE_RESEND_EMAIL

export async function sendGuestDraftEmail(type: 'quote' | 'sample', to: string | undefined, payload: any) {
  if (!to) return
  if (!RESEND_API_KEY) {
    // No API key provided; skip silently but inform in console for dev.
    console.info('[email] RESEND_API_KEY not set. Skipping email send.', { to, type })
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM ? `PTRN <${RESEND_FROM}>` : 'PTRN <notifications@ptrn.example>',
        to: [to],
        subject: type === 'quote' ? 'We received your quote request' : 'We received your sample order request',
        html: renderGuestDraftHtml(type, payload),
      })
    })

    if (!res.ok) {
      const t = await res.text()
      console.warn('[email] Resend error', t)
      return
    }
  } catch (e) {
    console.warn('[email] Failed to send email', e)
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
