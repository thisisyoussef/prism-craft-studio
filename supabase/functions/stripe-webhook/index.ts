// Supabase Edge Function (Deno) - Stripe Webhook Handler
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
// Configure endpoint in Stripe dashboard with STRIPE_WEBHOOK_SECRET

// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'
import Stripe from 'npm:stripe@^14.0.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('VITE_RESEND_API_KEY')
  const FROM_ADDR = Deno.env.get('RESEND_EMAIL') || Deno.env.get('VITE_RESEND_EMAIL') || 'PTRN <noreply@ptrn.local>'
  if (!RESEND_API_KEY || !to) return
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDR, to: [to], subject, html })
    })
    if (!resp.ok) {
      const t = await resp.text()
      console.warn('[webhook/email] Resend error', t)
    }
  } catch (e) {
    console.warn('[webhook/email] Failed to send', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature as string, webhookSecret)
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = (session.metadata?.orderId || '').toString()
        const phase = (session.metadata?.phase || '').toString() as 'deposit' | 'balance'
        const paymentIntentId = session.payment_intent?.toString()

        if (orderId && phase) {
          // Update payments row with checkout session + intent
          const { data: updated } = await supabase
            .from('payments')
            .update({
              status: 'processing',
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId || null,
            })
            .eq('order_id', orderId)
            .eq('phase', phase)
            .select('id')

          if (!updated || updated.length === 0) {
            // Insert if missing
            const amountCents = (session.amount_total as number | null) ?? null
            await supabase.from('payments').insert({
              order_id: orderId,
              phase,
              amount_cents: amountCents,
              status: 'processing',
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId || null,
            })
          }
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = (pi.metadata?.orderId || '').toString()
        const phase = (pi.metadata?.phase || '').toString() as 'deposit' | 'balance'

        if (orderId && phase) {
          const { data: updated } = await supabase
            .from('payments')
            .update({ status: 'succeeded', paid_at: new Date().toISOString(), stripe_payment_intent_id: pi.id })
            .eq('order_id', orderId)
            .eq('phase', phase)
            .select('id')

          if (!updated || updated.length === 0) {
            const amountCents = (pi.amount_received || pi.amount || 0)
            await supabase.from('payments').insert({
              order_id: orderId,
              phase,
              amount_cents: amountCents,
              status: 'succeeded',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: pi.id,
            })
          }

          // Optionally advance order status on deposit or balance
          if (phase === 'deposit') {
            await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId)
          }
          if (phase === 'balance') {
            await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId)
          }

          // Send receipts (best-effort): fetch order + profile email
          try {
            const { data: orderRow } = await supabase
              .from('orders')
              .select('id, user_id, total_amount, order_number')
              .eq('id', orderId)
              .maybeSingle()

            const userId = (orderRow as any)?.user_id as string | null
            let customerEmail: string | null = null
            if (userId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('user_id', userId)
                .maybeSingle()
              customerEmail = (profile as any)?.email || null
            }

            const amount = (pi.amount_received || pi.amount || 0) / 100
            const prettyPhase = phase === 'deposit' ? 'Deposit (40%)' : 'Balance (60%)'
            const subject = `Payment received: ${prettyPhase} for Order ${orderRow?.order_number || orderId}`
            const html = `
              <div style="font-family:Inter,system-ui,Arial,sans-serif">
                <h2>Thank you! Your ${prettyPhase} was received.</h2>
                <p><strong>Order:</strong> ${orderRow?.order_number || orderId}</p>
                <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Stripe Payment Intent:</strong> ${pi.id}</p>
                <p>We'll notify you as your order moves into production.</p>
              </div>
            `
            if (customerEmail) await sendEmail(customerEmail, subject, html)
            const notify = Deno.env.get('SALES_NOTIFY_EMAIL') || Deno.env.get('RESEND_EMAIL') || Deno.env.get('VITE_RESEND_EMAIL')
            if (notify) await sendEmail(notify, `[Internal] ${subject}`, html)
          } catch (e) {
            console.warn('[webhook] email step failed', e)
          }
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = (pi.metadata?.orderId || '').toString()
        const phase = (pi.metadata?.phase || '').toString() as 'deposit' | 'balance'
        if (orderId && phase) {
          await supabase
            .from('payments')
            .update({ status: 'failed', stripe_payment_intent_id: pi.id })
            .eq('order_id', orderId)
            .eq('phase', phase)
        }
        break
      }
      default:
        // No-op for other events for now
        break
    }
  } catch (e: any) {
    console.error('Webhook handler error', e)
    return new Response(JSON.stringify({ error: e?.message || 'Handler error' }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
