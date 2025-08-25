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
      payments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          order_id: string
          phase: Database["public"]["Enums"]["payment_phase"]
          amount_cents: number
          currency: string
          status: Database["public"]["Enums"]["payment_status"]
          paid_at: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          order_id: string
          phase: Database["public"]["Enums"]["payment_phase"]
          amount_cents: number
          currency?: string
          status?: Database["public"]["Enums"]["payment_status"]
          paid_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          order_id?: string
          phase?: Database["public"]["Enums"]["payment_phase"]
          amount_cents?: number
          currency?: string
          status?: Database["public"]["Enums"]["payment_status"]
          paid_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          metadata?: Json | null
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
      addresses: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          label: string | null
          full_name: string | null
          company: string | null
          phone: string | null
          address1: string
          address2: string | null
          city: string
          state: string | null
          postal_code: string | null
          country: string
          is_default_shipping: boolean
          is_default_billing: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          label?: string | null
          full_name?: string | null
          company?: string | null
          phone?: string | null
          address1: string
          address2?: string | null
          city: string
          state?: string | null
          postal_code?: string | null
          country?: string
          is_default_shipping?: boolean
          is_default_billing?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          label?: string | null
          full_name?: string | null
          company?: string | null
          phone?: string | null
          address1?: string
          address2?: string | null
          city?: string
          state?: string | null
          postal_code?: string | null
          country?: string
          is_default_shipping?: boolean
          is_default_billing?: boolean
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
      orders: {
        Row: {
          artwork_files: string[] | null
          colors: string[] | null
          company_id: string | null
          created_at: string
          custom_text: string | null
          customization_details: Json | null
          id: string
          notes: string | null
          order_number: string | null
          placement: string | null
          product_id: string | null
          quantity: number
          sizes: string[] | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artwork_files?: string[] | null
          colors?: string[] | null
          company_id?: string | null
          created_at?: string
          custom_text?: string | null
          customization_details?: Json | null
          id?: string
          notes?: string | null
          order_number?: string | null
          placement?: string | null
          product_id?: string | null
          quantity?: number
          sizes?: string[] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artwork_files?: string[] | null
          colors?: string[] | null
          company_id?: string | null
          created_at?: string
          custom_text?: string | null
          customization_details?: Json | null
          id?: string
          notes?: string | null
          order_number?: string | null
          placement?: string | null
          product_id?: string | null
          quantity?: number
          sizes?: string[] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
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
          {
            foreignKeyName: "samples_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
      sample_status:
        | "pending"
        | "approved"
        | "shipped"
        | "delivered"
        | "converted_to_order"
      payment_status:
        | "requires_payment_method"
        | "requires_action"
        | "processing"
        | "succeeded"
        | "canceled"
        | "failed"
        | "refunded"
        | "partially_refunded"
      payment_phase: "deposit" | "balance"
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
