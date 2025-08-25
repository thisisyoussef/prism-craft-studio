import { createClient } from '@supabase/supabase-js'

// Vite exposes only VITE_* at runtime in the browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Please configure your .env file.')
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string)

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          industry: string | null
          size: string | null
          address: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          size?: string | null
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          size?: string | null
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          company_id: string
          user_id: string
          product_type: string
          quantity: number
          unit_price: number
          total_price: number
          customization: any
          status: string
          deposit_paid: boolean
          final_payment_paid: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          product_type: string
          quantity: number
          unit_price: number
          total_price: number
          customization?: any
          status?: string
          deposit_paid?: boolean
          final_payment_paid?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          product_type?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          customization?: any
          status?: string
          deposit_paid?: boolean
          final_payment_paid?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      samples: {
        Row: {
          id: string
          company_id: string
          user_id: string
          products: any
          total_price: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          products: any
          total_price: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          products?: any
          total_price?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      designer_bookings: {
        Row: {
          id: string
          company_id: string
          user_id: string
          designer_id: string
          consultation_type: string
          scheduled_date: string
          status: string
          price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          designer_id: string
          consultation_type: string
          scheduled_date: string
          status?: string
          price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          designer_id?: string
          consultation_type?: string
          scheduled_date?: string
          status?: string
          price?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}