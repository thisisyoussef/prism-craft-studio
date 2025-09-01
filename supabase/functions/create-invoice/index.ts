// Supabase Edge Function (Deno) - Create and Send Stripe Invoice (with resend)
// Deploy: supabase functions deploy create-invoice --no-verify-jwt
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@^14.0.0'
import { createClient } from 'jsr:@supabase/supabase-js'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Phase = 'deposit' | 'balance' | 'custom'

async function getOrCreateCustomer(stripe: Stripe, email: string, name?: string | null, company?: string | null) {
  const search = await stripe.customers.search({ query: `email:'${email}'` })
  if (search.data.length > 0) return search.data[0]
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: company ? { company } : undefined,
  })
  return customer
}

function computePhaseAmount(totalCents: number, phase: Phase): number {
  if (phase === 'deposit') return Math.round(totalCents * 0.4)
  if (phase === 'balance') return Math.round(totalCents * 0.6)
  return totalCents
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')

  if (!stripeSecret || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const contentType = req.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await req.json() : {}

    const action: 'create' | 'resend' = body.action || 'create'
    if (action === 'resend') {
      const invoiceId: string | undefined = body.invoice_id
      if (!invoiceId) {
        return new Response(JSON.stringify({ error: 'invoice_id is required for resend' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const invoice = await stripe.invoices.sendInvoice(invoiceId)
      return new Response(JSON.stringify({ resent: true, invoice_id: invoice.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderId: string | undefined = body.order_id
    const phase: Phase = body.phase || 'custom'
    let amountCents: number | undefined = body.amount_cents
    const currency: string = body.currency || 'usd'
    const daysUntilDue: number = body.days_until_due || 7

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch order, profile, company
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, user_id, company_id')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, company_id')
      .eq('user_id', (order as any).user_id)
      .maybeSingle()

    let companyName: string | null = null
    if ((order as any).company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', (order as any).company_id)
        .maybeSingle()
      companyName = (company as any)?.name || null
    }

    const email: string | undefined = (profile as any)?.email || undefined
    const customerName = [
      (profile as any)?.first_name || null,
      (profile as any)?.last_name || null,
    ].filter(Boolean).join(' ') || null

    if (!email) {
      return new Response(JSON.stringify({ error: 'Customer email not found for order' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const customer = await getOrCreateCustomer(stripe, email, customerName, companyName)

    // Compute amount if needed
    if (typeof amountCents !== 'number' || !Number.isFinite(amountCents)) {
      const totalCents = Math.round(Number((order as any).total_amount || 0) * 100)
      amountCents = computePhaseAmount(totalCents, phase)
    }

    const prettyPhase = phase === 'deposit' ? 'Deposit (40%)' : phase === 'balance' ? 'Balance (60%)' : 'Invoice'
    const description = `Order ${(order as any).order_number || orderId} • ${prettyPhase}`

    // Create Invoice Item and Invoice
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency,
      unit_amount: amountCents,
      quantity: 1,
      description,
      metadata: { orderId, phase },
    })

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: daysUntilDue,
      metadata: { orderId, phase },
    })

    // Finalize and send
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    const sent = await stripe.invoices.sendInvoice(finalized.id)

    // Upsert payments row for tracking
    try {
      const paymentPhase: any = phase === 'custom' ? 'deposit' : phase
      await supabase
        .from('payments')
        .upsert({
          order_id: orderId,
          phase: paymentPhase,
          amount_cents: amountCents!,
          currency,
          status: 'requires_payment_method',
          metadata: { stripe_invoice_id: sent.id, hosted_invoice_url: sent.hosted_invoice_url },
        }, { onConflict: 'order_id,phase' })
    } catch (_e) {
      // non-fatal
    }

    return new Response(JSON.stringify({ invoice_id: sent.id, url: sent.hosted_invoice_url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('[create-invoice] error', e)
    return new Response(JSON.stringify({ error: e?.message || 'Handler error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

