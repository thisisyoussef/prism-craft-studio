// Supabase Edge Function - Send Order Email Notifications
// Deploy with: supabase functions deploy send-order-emails --no-verify-jwt

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  type: 'order_created' | 'order_status_update' | 'production_update' | 'payment_reminder' | 'order_completed';
  to: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  data?: Record<string, any>;
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_ADDR = Deno.env.get('RESEND_EMAIL') || 'PTRN Studio <orders@ptrn.studio>'
  
  if (!RESEND_API_KEY || !to) {
    console.warn('Missing email configuration or recipient')
    return false
  }
  
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${RESEND_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        from: FROM_ADDR, 
        to: [to], 
        subject, 
        html 
      })
    })
    
    if (!resp.ok) {
      const errorText = await resp.text()
      console.error('Resend API error:', errorText)
      return false
    }
    
    return true
  } catch (e) {
    console.error('Email send error:', e)
    return false
  }
}

function generateOrderCreatedEmail(data: any): { subject: string; html: string } {
  const { orderNumber, customerName, totalAmount, depositAmount } = data
  
  return {
    subject: `Order confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: Inter, system-ui, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Order confirmed</h1>
          <p style="color: #6b7280; font-size: 16px;">Thank you for your order, ${customerName || 'valued customer'}!</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Order details</h2>
          <p style="margin: 5px 0;"><strong>Order number:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Total amount:</strong> $${totalAmount?.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Deposit required:</strong> $${depositAmount?.toFixed(2)}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 15px;">What happens next?</h3>
          <ol style="color: #4b5563; line-height: 1.6;">
            <li>Complete your deposit payment to begin production</li>
            <li>We'll review your design and start crafting your order</li>
            <li>You'll receive updates throughout the production process</li>
            <li>Complete the balance payment when your order is ready</li>
            <li>Your order will be shipped to you</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Reply to this email or contact us at orders@ptrn.studio
          </p>
        </div>
      </div>
    `
  }
}

function generateStatusUpdateEmail(data: any): { subject: string; html: string } {
  const { orderNumber, customerName, status, statusMessage, nextSteps } = data
  
  const statusDisplay = status?.replace(/_/g, ' ') || 'updated'
  
  return {
    subject: `Order update - ${orderNumber}`,
    html: `
      <div style="font-family: Inter, system-ui, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Order update</h1>
          <p style="color: #6b7280; font-size: 16px;">Your order ${orderNumber} has been ${statusDisplay}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Current status</h2>
          <p style="margin: 5px 0;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${statusDisplay}</p>
          ${statusMessage ? `<p style="margin: 15px 0; color: #4b5563;">${statusMessage}</p>` : ''}
        </div>
        
        ${nextSteps ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Next steps</h3>
            <p style="color: #4b5563; line-height: 1.6;">${nextSteps}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${Deno.env.get('VITE_APP_URL')}/orders/${data.orderId}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View order details
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Reply to this email or contact us at orders@ptrn.studio
          </p>
        </div>
      </div>
    `
  }
}

function generateProductionUpdateEmail(data: any): { subject: string; html: string } {
  const { orderNumber, customerName, updateDescription, stage, photos } = data
  
  return {
    subject: `Production update - ${orderNumber}`,
    html: `
      <div style="font-family: Inter, system-ui, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Production update</h1>
          <p style="color: #6b7280; font-size: 16px;">New update for your order ${orderNumber}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Update details</h2>
          <p style="margin: 5px 0;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Stage:</strong> ${stage?.replace(/_/g, ' ') || 'In progress'}</p>
          ${updateDescription ? `<p style="margin: 15px 0; color: #4b5563;">${updateDescription}</p>` : ''}
        </div>
        
        ${photos && photos.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Progress photos</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              ${photos.map((photo: string) => `
                <img src="${photo}" alt="Production progress" 
                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;">
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${Deno.env.get('VITE_APP_URL')}/orders/${data.orderId}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View full order details
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Reply to this email or contact us at orders@ptrn.studio
          </p>
        </div>
      </div>
    `
  }
}

function generatePaymentReminderEmail(data: any): { subject: string; html: string } {
  const { orderNumber, customerName, phase, amount, dueDate } = data
  
  const phaseDisplay = phase === 'deposit' ? 'deposit' : 'final balance'
  
  return {
    subject: `Payment reminder - ${orderNumber}`,
    html: `
      <div style="font-family: Inter, system-ui, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Payment reminder</h1>
          <p style="color: #6b7280; font-size: 16px;">Your ${phaseDisplay} payment is ready</p>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h2 style="color: #92400e; margin-bottom: 15px; font-size: 18px;">Payment required</h2>
          <p style="margin: 5px 0;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${amount?.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Payment type:</strong> ${phaseDisplay}</p>
          ${dueDate ? `<p style="margin: 5px 0;"><strong>Due date:</strong> ${dueDate}</p>` : ''}
        </div>
        
        <div style="margin-bottom: 30px;">
          <p style="color: #4b5563; line-height: 1.6;">
            ${phase === 'deposit' 
              ? 'Complete your deposit payment to begin production of your order.'
              : 'Your order is complete and ready for shipment. Please complete the final balance payment to proceed with shipping.'
            }
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${Deno.env.get('VITE_APP_URL')}/orders/${data.orderId}" 
             style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Complete payment
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Reply to this email or contact us at orders@ptrn.studio
          </p>
        </div>
      </div>
    `
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { type, to, orderId, orderNumber, customerName, data } = payload

    if (!to || !type || !orderId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let emailContent: { subject: string; html: string }

    switch (type) {
      case 'order_created':
        emailContent = generateOrderCreatedEmail({ orderNumber, customerName, ...data })
        break
      
      case 'order_status_update':
        emailContent = generateStatusUpdateEmail({ orderNumber, customerName, orderId, ...data })
        break
      
      case 'production_update':
        emailContent = generateProductionUpdateEmail({ orderNumber, customerName, orderId, ...data })
        break
      
      case 'payment_reminder':
        emailContent = generatePaymentReminderEmail({ orderNumber, customerName, orderId, ...data })
        break
      
      case 'order_completed':
        emailContent = {
          subject: `Order completed - ${orderNumber}`,
          html: `
            <div style="font-family: Inter, system-ui, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #059669; margin-bottom: 10px;">Order completed!</h1>
                <p style="color: #6b7280; font-size: 16px;">Your order ${orderNumber} has been delivered</p>
              </div>
              
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #059669;">
                <p style="color: #065f46; margin: 0;">
                  Thank you for choosing PTRN Studio. We hope you love your custom apparel!
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">
                  We'd love to hear your feedback at orders@ptrn.studio
                </p>
              </div>
            </div>
          `
        }
        break
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid email type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const success = await sendEmail(to, emailContent.subject, emailContent.html)

    if (success) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error: any) {
    console.error('Email function error:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
