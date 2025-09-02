export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address1: string
          address2: string | null
          city: string
          company: string | null
          country: string
          created_at: string
          full_name: string | null
          id: string
          is_default_billing: boolean
          is_default_shipping: boolean
          label: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address1: string
          address2?: string | null
          city: string
          company?: string | null
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address1?: string
          address2?: string | null
          city?: string
          company?: string | null
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      designer_bookings: {
        Row: {
          company_id: string | null
          consultation_type: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          preferred_date: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          consultation_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          preferred_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          consultation_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          preferred_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designer_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline: {
        Row: {
          created_at: string
          description: string
          event_data: Json
          event_type: string
          id: string
          order_id: string
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_data?: Json
          event_type: string
          id?: string
          order_id: string
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_data?: Json
          event_type?: string
          id?: string
          order_id?: string
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery: string | null
          admin_notes: string | null
          artwork_files: Json | null
          balance_amount: number
          balance_paid_at: string | null
          colors: string[]
          company_id: string | null
          created_at: string
          customer_notes: string | null
          customization: Json
          deposit_amount: number
          deposit_paid_at: string | null
          estimated_delivery: string | null
          id: string
          labels: string[] | null
          order_number: string
          print_locations: Json
          priority: string | null
          product_category: string
          product_id: string | null
          product_name: string
          production_notes: string | null
          quantity: number
          shipping_address: Json | null
          sizes: Json
          status: string
          stripe_balance_payment_intent: string | null
          stripe_deposit_payment_intent: string | null
          total_amount: number
          tracking_number: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_delivery?: string | null
          admin_notes?: string | null
          artwork_files?: Json | null
          balance_amount?: number
          balance_paid_at?: string | null
          colors?: string[]
          company_id?: string | null
          created_at?: string
          customer_notes?: string | null
          customization?: Json
          deposit_amount?: number
          deposit_paid_at?: string | null
          estimated_delivery?: string | null
          id?: string
          labels?: string[] | null
          order_number: string
          print_locations?: Json
          priority?: string | null
          product_category: string
          product_id?: string | null
          product_name: string
          production_notes?: string | null
          quantity: number
          shipping_address?: Json | null
          sizes?: Json
          status?: string
          stripe_balance_payment_intent?: string | null
          stripe_deposit_payment_intent?: string | null
          total_amount: number
          tracking_number?: string | null
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_delivery?: string | null
          admin_notes?: string | null
          artwork_files?: Json | null
          balance_amount?: number
          balance_paid_at?: string | null
          colors?: string[]
          company_id?: string | null
          created_at?: string
          customer_notes?: string | null
          customization?: Json
          deposit_amount?: number
          deposit_paid_at?: string | null
          estimated_delivery?: string | null
          id?: string
          labels?: string[] | null
          order_number?: string
          print_locations?: Json
          priority?: string | null
          product_category?: string
          product_id?: string | null
          product_name?: string
          production_notes?: string | null
          quantity?: number
          shipping_address?: Json | null
          sizes?: Json
          status?: string
          stripe_balance_payment_intent?: string | null
          stripe_deposit_payment_intent?: string | null
          total_amount?: number
          tracking_number?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string
          paid_at: string | null
          phase: string
          status: string
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id: string
          paid_at?: string | null
          phase: string
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          paid_at?: string | null
          phase?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          back_image_url: string | null
          color_hex: string
          color_name: string
          created_at: string
          front_image_url: string | null
          id: string
          image_url: string | null
          price: number | null
          product_id: string
          sleeve_image_url: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          back_image_url?: string | null
          color_hex: string
          color_name: string
          created_at?: string
          front_image_url?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          product_id: string
          sleeve_image_url?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          back_image_url?: string | null
          color_hex?: string
          color_name?: string
          created_at?: string
          front_image_url?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          product_id?: string
          sleeve_image_url?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_updates: {
        Row: {
          actual_completion: string | null
          created_at: string
          created_by: string | null
          description: string | null
          documents: Json | null
          estimated_completion: string | null
          id: string
          order_id: string
          photos: Json | null
          stage: string
          status: string
          title: string
          updated_at: string
          visible_to_customer: boolean | null
        }
        Insert: {
          actual_completion?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          estimated_completion?: string | null
          id?: string
          order_id: string
          photos?: Json | null
          stage: string
          status: string
          title: string
          updated_at?: string
          visible_to_customer?: boolean | null
        }
        Update: {
          actual_completion?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          estimated_completion?: string | null
          id?: string
          order_id?: string
          photos?: Json | null
          stage?: string
          status?: string
          title?: string
          updated_at?: string
          visible_to_customer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "production_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_colors: string[] | null
          available_sizes: string[] | null
          base_price: number | null
          category: string | null
          created_at: string
          customization_options: Json | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          available_colors?: string[] | null
          available_sizes?: string[] | null
          base_price?: number | null
          category?: string | null
          created_at?: string
          customization_options?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          available_colors?: string[] | null
          available_sizes?: string[] | null
          base_price?: number | null
          category?: string | null
          created_at?: string
          customization_options?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      samples: {
        Row: {
          company_id: string | null
          converted_order_id: string | null
          created_at: string
          id: string
          product_names: string[] | null
          sample_number: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["sample_status"] | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          id?: string
          product_names?: string[] | null
          sample_number?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["sample_status"] | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          id?: string
          product_names?: string[] | null
          sample_number?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["sample_status"] | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "samples_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_user: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_sample_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      order_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "in_production"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_phase: "deposit" | "balance"
      payment_status:
        | "requires_payment_method"
        | "requires_action"
        | "processing"
        | "succeeded"
        | "canceled"
        | "failed"
        | "refunded"
        | "partially_refunded"
      sample_status:
        | "pending"
        | "approved"
        | "shipped"
        | "delivered"
        | "converted_to_order"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      order_status: [
        "draft",
        "pending",
        "confirmed",
        "in_production",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_phase: ["deposit", "balance"],
      payment_status: [
        "requires_payment_method",
        "requires_action",
        "processing",
        "succeeded",
        "canceled",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      sample_status: [
        "pending",
        "approved",
        "shipped",
        "delivered",
        "converted_to_order",
      ],
    },
  },
} as const
