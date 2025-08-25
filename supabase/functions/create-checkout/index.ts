// Supabase Edge Function (Deno) - Create Stripe Checkout Session
// Deploy with: supabase functions deploy create-checkout --no-verify-jwt (if using Stripe signature instead)
// Env needed in Supabase project: STRIPE_SECRET_KEY, VITE_APP_URL

// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Using Stripe via npm specifier (Deno supports npm: imports)
import Stripe from 'npm:stripe@^14.0.0'
import { createClient } from 'jsr:@supabase/supabase-js'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    const appUrl = Deno.env.get('VITE_APP_URL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')

    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!appUrl) {
      return new Response(JSON.stringify({ error: 'Missing VITE_APP_URL function secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase service credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
    })

    // Robust request body parsing
    let orderId: string | undefined
    let phase: 'deposit' | 'balance' | undefined
    let amountCents: number | undefined
    let currency: string | undefined
    try {
      const raw = await req.text()
      if (!raw || !raw.trim()) {
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const body = JSON.parse(raw)
      orderId = body?.orderId
      phase = body?.phase
      amountCents = body?.amountCents
      currency = body?.currency ?? 'usd'
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!orderId || !phase || !amountCents) {
      return new Response(JSON.stringify({ error: 'orderId, phase, amountCents are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      payment_intent_data: {
        metadata: { orderId, phase },
      },
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: `Order ${orderId} ${phase === 'deposit' ? 'Deposit (40%)' : 'Balance (60%)'}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/orders/${orderId}?payment=success&phase=${phase}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/orders/${orderId}?payment=cancelled&phase=${phase}&session_id={CHECKOUT_SESSION_ID}`,
      metadata: { orderId, phase },
    })

    // Best-effort: mark payment as processing immediately with session id so UI reflects progress after redirect
    try {
      const supabase = createClient(supabaseUrl, serviceKey)
      await supabase
        .from('payments')
        .upsert({
          order_id: orderId,
          phase,
          amount_cents: amountCents,
          status: 'processing',
          stripe_checkout_session_id: session.id,
          currency,
        }, { onConflict: 'order_id,phase' })
    } catch (_e) {
      // non-fatal
      console.warn('[create-checkout] upsert payments processing failed')
    }

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
