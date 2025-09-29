// Email helper that proxies through our Node API (server sends via provider like Resend)
import api from '@/lib/api'
const RESEND_FROM = import.meta.env.VITE_RESEND_EMAIL

export async function sendGuestDraftEmail(type: 'quote' | 'sample', to: string | undefined, payload: any) {
  if (!to) return
  try {
    const subject = type === 'quote' ? 'Quote request received' : 'Sample request received'
    const html = renderGuestDraftHtml(type, payload)
    await api.post('/emails/send', { to, subject, html })
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

export async function sendOrderUpdateEmail(to: string | undefined, payload: {
  order_number?: string
  order_id?: string
  status?: string
  explanation?: string
  notes?: string | null
}) {
  if (!to) return
  try {
    const subject = `Order update: ${payload?.order_number || payload?.order_id || ''}`.trim()
    const html = renderOrderUpdateHtml(payload)
    await api.post('/emails/send', { to, subject, html })
  } catch (e) {
    console.warn('[email] Failed to send order update via API.', e)
    console.info('[email] preview', {
      to,
      type: 'order_update',
      from: RESEND_FROM ? `PTRN <${RESEND_FROM}>` : 'PTRN <notifications@ptrn.example>',
      preview: renderOrderUpdateHtml(payload).slice(0, 2000),
    })
  }
}

function renderGuestDraftHtml(type: 'quote' | 'sample', payload: any) {
  const intro = type === 'quote' ? 'Thanks for your quote request.' : 'Thanks for your sample request.'
  const info = payload?.info || {}
  const address = payload?.address || payload?.shippingAddress || {}
  const items = Array.isArray(payload?.draft?.items) ? payload.draft.items : []

  const header = `
    <div style="padding:24px 0;border-bottom:1px solid #eee">
      <div style="font-size:18px;font-weight:600;color:#111">Prism Craft Studio</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">Custom apparel, thoughtfully made</div>
    </div>
  `

  const customerBlock = `
    <div style="margin-top:16px">
      <div style="font-size:14px;color:#111;font-weight:600;margin-bottom:8px">Contact</div>
      <div style="font-size:14px;color:#111">${escapeHtml(info.name || info.fullName || '—')}</div>
      ${info.email ? `<div style="font-size:13px;color:#374151">${escapeHtml(info.email)}</div>` : ''}
      ${info.phone ? `<div style="font-size:13px;color:#374151">${escapeHtml(info.phone)}</div>` : ''}
    </div>
  `

  const addressBlock = (address && (address.address || address.city || address.state || address.zip)) ? `
    <div style="margin-top:16px">
      <div style="font-size:14px;color:#111;font-weight:600;margin-bottom:8px">Shipping address</div>
      <div style="font-size:13px;color:#374151;white-space:pre-line">${escapeHtml(formatAddress(address))}</div>
    </div>
  ` : ''

  const totals = payload?.totals || {}
  const totalsBlock = Object.keys(totals).length ? `
    <div style="margin-top:16px">
      <div style="font-size:14px;color:#111;font-weight:600;margin-bottom:8px">Summary</div>
      ${renderTotals(totals)}
    </div>
  ` : ''

  const detailsBlock = type === 'sample'
    ? renderSampleItems(items)
    : renderQuoteDetails(payload)

  const footer = `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#6b7280;font-size:12px">
      You can reply to this email with any questions. We’ll follow up shortly.
    </div>
  `

  return `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        ${header}
        <div style="margin-top:20px">
          <div style="font-size:18px;color:#111;font-weight:600;margin-bottom:6px">${intro}</div>
          <div style="font-size:14px;color:#374151">We received your details and saved them on our side.</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:16px;margin-top:16px">
          ${customerBlock}
          ${addressBlock}
          ${detailsBlock}
          ${totalsBlock}
        </div>
        ${footer}
      </div>
    </div>
  `
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderOrderUpdateHtml(payload: {
  order_number?: string
  order_id?: string
  status?: string
  explanation?: string
  notes?: string | null
}) {
  const orderNo = payload?.order_number || payload?.order_id || 'Your order'
  const status = payload?.status || 'updated'
  const explanation = payload?.explanation || ''
  const notes = payload?.notes || ''
  return `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        <div style="padding:0 0 16px 0;border-bottom:1px solid #eee">
          <div style="font-size:18px;font-weight:600;color:#111">Order update</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">${escapeHtml(orderNo)}</div>
        </div>
        <div style="margin-top:16px;font-size:14px;color:#111">
          <div>Status: <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;font-weight:600">${escapeHtml(String(status).replace(/_/g,' '))}</span></div>
          ${explanation ? `<div style="margin-top:12px;color:#374151">${escapeHtml(explanation)}</div>` : ''}
          ${notes ? `<div style="margin-top:8px;color:#6b7280"><em>Note:</em> ${escapeHtml(notes)}</div>` : ''}
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#6b7280;font-size:12px">
          Reply to this email if you have any questions.
        </div>
      </div>
    </div>
  `
}

// Helpers
function formatMoney(n: any): string {
  const num = typeof n === 'number' ? n : Number(n || 0)
  if (!isFinite(num)) return '$0.00'
  return `$${num.toFixed(2)}`
}

function renderTotals(totals: Record<string, any>) {
  const entries = Object.entries(totals)
  if (entries.length === 0) return ''
  return `
    <table style="width:100%;font-size:14px;color:#111;border-collapse:collapse">
      <tbody>
        ${entries.map(([k, v]) => `
          <tr>
            <td style="padding:6px 0;color:#374151;text-transform:capitalize">${escapeHtml(k.replace(/_/g,' '))}</td>
            <td style="padding:6px 0;text-align:right;font-weight:${k === 'total' ? '600' : '400'}">${typeof v === 'number' ? formatMoney(v) : escapeHtml(String(v))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function renderSampleItems(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return ''
  return `
    <div>
      <div style="font-size:14px;color:#111;font-weight:600;margin-bottom:8px">Items</div>
      <table style="width:100%;font-size:14px;color:#111;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;color:#6b7280;font-weight:500">Product</th>
            <th style="text-align:left;padding:8px 0;color:#6b7280;font-weight:500">Type</th>
            <th style="text-align:right;padding:8px 0;color:#6b7280;font-weight:500">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td style="padding:6px 0;border-top:1px solid #f3f4f6">${escapeHtml(it.productName || it.name || '-')}${it.colorName ? ` <span style=\"color:#6b7280\">• ${escapeHtml(it.colorName)}</span>` : ''}</td>
              <td style="padding:6px 0;border-top:1px solid #f3f4f6">${escapeHtml((it.type || 'designed'))}</td>
              <td style="padding:6px 0;border-top:1px solid #f3f4f6;text-align:right">${formatMoney(it.unitPrice || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderQuoteDetails(payload: any) {
  const draft = payload?.draft || {}
  const sizes = draft?.sizes || payload?.sizes || {}
  const qty = draft?.quantity || payload?.pricing?.quantity || 0
  const product = draft?.product_type || payload?.product_name || 'Custom product'
  const prints = Array.isArray(draft?.customization_prints) ? draft.customization_prints : (payload?.print_locations || [])

  const sizeRows = Object.keys(sizes).length ? `
    <div style="margin-top:8px">
      <div style="font-size:13px;color:#6b7280;margin-bottom:6px">Sizes</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${Object.entries(sizes).map(([sz, n]) => `<div style=\"border:1px solid #e5e7eb;border-radius:8px;padding:6px 8px;font-size:12px\">${escapeHtml(String(sz))}: ${escapeHtml(String(n))}</div>`).join('')}
      </div>
    </div>
  ` : ''

  const printsRows = Array.isArray(prints) && prints.length ? `
    <div style="margin-top:8px">
      <div style="font-size:13px;color:#6b7280;margin-bottom:6px">Prints</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${prints.map((p: any) => `<div style=\"border:1px solid #e5e7eb;border-radius:8px;padding:6px 8px;font-size:12px\">${escapeHtml((p.location || '-').toString())}${p.method ? ` • ${escapeHtml(p.method.toString())}` : ''}${p.size ? ` • ${escapeHtml(p.size.toString())}` : ''}</div>`).join('')}
      </div>
    </div>
  ` : ''

  const notes = draft?.notes || payload?.notes

  return `
    <div>
      <div style="font-size:14px;color:#111;font-weight:600;margin-bottom:8px">Request</div>
      <div style="font-size:14px;color:#111">${escapeHtml(product)} • Qty ${escapeHtml(String(qty || 0))}</div>
      ${sizeRows}
      ${printsRows}
      ${notes ? `<div style=\"margin-top:8px;font-size:13px;color:#374151\"><span style=\"color:#6b7280\">Notes:</span> ${escapeHtml(String(notes))}</div>` : ''}
    </div>
  `
}

function formatAddress(a: any): string {
  const parts = [a.name, a.company, a.address, [a.city, a.state].filter(Boolean).join(', '), a.zip, a.country].filter(Boolean)
  return parts.join('\n')
}
