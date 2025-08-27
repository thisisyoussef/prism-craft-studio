// Supabase Edge Function (Deno) - Reconcile Payment
// Deploy with: supabase functions deploy reconcile-payment --no-verify-jwt
// Purpose: If webhook delivery is delayed/missed, the client can call this
// function with a Stripe Checkout Session ID (or order/phase) to reconcile
// payment status from Stripe and update the database accordingly.

// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'
import Stripe from 'npm:stripe@^14.0.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')

  if (!stripeSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const contentType = req.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await req.json() : {}

    const sessionId: string | undefined = body.session_id
    const orderId: string | undefined = body.order_id
    const phase: 'deposit' | 'balance' | undefined = body.phase

    if (!sessionId && !(orderId && phase)) {
      return new Response(JSON.stringify({ error: 'Provide session_id or (order_id and phase)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve Checkout Session and Payment Intent
    let session: Stripe.Checkout.Session | null = null
    let paymentIntentId: string | null = null

    if (sessionId) {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      paymentIntentId = session.payment_intent ? String(session.payment_intent) : null
    } else if (orderId && phase) {
      // Try to find a related checkout session ID in DB first
      const { data: payRow } = await supabase
        .from('payments')
        .select('stripe_checkout_session_id')
        .eq('order_id', orderId)
        .eq('phase', phase)
        .maybeSingle()
      if (payRow?.stripe_checkout_session_id) {
        session = await stripe.checkout.sessions.retrieve(payRow.stripe_checkout_session_id)
        paymentIntentId = session.payment_intent ? String(session.payment_intent) : null
      }
    }

    let pi: Stripe.PaymentIntent | null = null
    if (paymentIntentId) {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    } else if (session?.payment_intent) {
      paymentIntentId = String(session.payment_intent)
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    }

    // Determine orderId/phase from metadata if missing
    const resolvedOrderId = orderId || String((pi?.metadata?.orderId || session?.metadata?.orderId || ''))
    const resolvedPhase = (phase || (String((pi?.metadata?.phase || session?.metadata?.phase || '')) as any)) as
      | 'deposit'
      | 'balance'
      | undefined

    if (!resolvedOrderId || !resolvedPhase) {
      return new Response(JSON.stringify({ error: 'Unable to resolve order/phase from Stripe' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update DB based on PI status
    const status = pi?.status || session?.payment_status

    if (status === 'succeeded' || status === 'paid') {
      const amountCents = (pi?.amount_received || pi?.amount || session?.amount_total || 0) as number

      const { data: updated } = await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session?.id || null,
          stripe_payment_intent_id: paymentIntentId || null,
        })
        .eq('order_id', resolvedOrderId)
        .eq('phase', resolvedPhase)
        .select('id')

      if (!updated || updated.length === 0) {
        await supabase.from('payments').insert({
          order_id: resolvedOrderId,
          phase: resolvedPhase,
          amount_cents: amountCents || 0,
          status: 'succeeded',
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session?.id || null,
          stripe_payment_intent_id: paymentIntentId || null,
        })
      }

      // Advance order status to mirror webhook behavior
      if (resolvedPhase === 'deposit') {
        await supabase.from('orders').update({ status: 'pending' }).eq('id', resolvedOrderId)
      } else if (resolvedPhase === 'balance') {
        await supabase.from('orders').update({ status: 'confirmed' }).eq('id', resolvedOrderId)
      }

      return new Response(
        JSON.stringify({ reconciled: true, phase: resolvedPhase, order_id: resolvedOrderId, status: 'succeeded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (status === 'processing') {
      // Ensure we reflect processing state
      await supabase
        .from('payments')
        .update({ status: 'processing', stripe_checkout_session_id: session?.id || null, stripe_payment_intent_id: paymentIntentId || null })
        .eq('order_id', resolvedOrderId)
        .eq('phase', resolvedPhase)
      return new Response(JSON.stringify({ reconciled: true, status: 'processing' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ reconciled: false, status: status || 'unknown' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('[reconcile-payment] error', e)
    return new Response(JSON.stringify({ error: e?.message || 'Handler error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
