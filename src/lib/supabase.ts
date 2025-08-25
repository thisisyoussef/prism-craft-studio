import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-project.supabase.co'
const supabaseAnonKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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