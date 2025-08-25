// Supabase Edge Function - send-email
// Sends emails via Resend using server-side secrets.
// Deploy: supabase functions deploy send-email --no-verify-jwt (or with JWT if you want auth)

// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type EmailType = 'quote' | 'sample'

const SendEmailSchema = z.object({
  type: z.enum(['quote', 'sample']),
  to: z.string().email('Invalid recipient email'),
  payload: z.any().optional(),
})
type SendEmailRequest = z.infer<typeof SendEmailSchema>

function renderGuestDraftHtml(type: EmailType, payload: any) {
  const intro = type === 'quote' ? 'Thanks for your quote request!' : 'Thanks for your sample order request!'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('VITE_RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_EMAIL') || Deno.env.get('VITE_RESEND_EMAIL') || 'PTRN <notifications@ptrn.example>'

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: SendEmailRequest
  try {
    const raw = await req.text()
    const parsed = SendEmailSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join('\n') || 'Invalid request body'
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    body = parsed.data
  }
  catch (_e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { type, to, payload } = body

  const subject = type === 'quote' ? 'We received your quote request' : 'We received your sample order request'
  const html = renderGuestDraftHtml(type, payload)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html })
    })

    if (!res.ok) {
      const t = await res.text()
      let detail: any
      try { detail = JSON.parse(t) } catch { detail = t }
      return new Response(JSON.stringify({ error: 'Email provider error', detail }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' && e.message.length < 200 ? e.message : 'Failed to send email'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
