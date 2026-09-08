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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          brand_color: string
          cash_enabled: boolean
          closed_message: string
          delivery_fee: number
          delivery_mode: string
          first_order_discount_pct: number
          free_shipping_min: number
          id: number
          min_order: number
          payment_alias: string
          pickup_address: string
          service_fee_pct: number
          store_address: string
          store_email: string
          store_hours: string
          store_logo_shape: string
          store_logo_url: string | null
          store_name: string
          store_open: boolean
          store_tagline: string
          store_whatsapp: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brand_color?: string
          cash_enabled?: boolean
          closed_message?: string
          delivery_fee?: number
          delivery_mode?: string
          first_order_discount_pct?: number
          free_shipping_min?: number
          id?: number
          min_order?: number
          payment_alias?: string
          pickup_address?: string
          service_fee_pct?: number
          store_address?: string
          store_email?: string
          store_hours?: string
          store_logo_shape?: string
          store_logo_url?: string | null
          store_name?: string
          store_open?: boolean
          store_tagline?: string
          store_whatsapp?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brand_color?: string
          cash_enabled?: boolean
          closed_message?: string
          delivery_fee?: number
          delivery_mode?: string
          first_order_discount_pct?: number
          free_shipping_min?: number
          id?: number
          min_order?: number
          payment_alias?: string
          pickup_address?: string
          service_fee_pct?: number
          store_address?: string
          store_email?: string
          store_hours?: string
          store_logo_shape?: string
          store_logo_url?: string | null
          store_name?: string
          store_open?: boolean
          store_tagline?: string
          store_whatsapp?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          emoji: string
          id: string
          name: string
          slug: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          emoji?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          emoji?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_dates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_slots: {
        Row: {
          created_at: string
          date_id: string
          end_time: string
          id: string
          is_active: boolean
          max_orders: number | null
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
          zone_ids: string[]
        }
        Insert: {
          created_at?: string
          date_id: string
          end_time: string
          id?: string
          is_active?: boolean
          max_orders?: number | null
          sort_order?: number
          start_time: string
          tenant_id: string
          updated_at?: string
          zone_ids?: string[]
        }
        Update: {
          created_at?: string
          date_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          max_orders?: number | null
          sort_order?: number
          start_time?: string
          tenant_id?: string
          updated_at?: string
          zone_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_slots_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "delivery_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          tenant_id: string
          unit_price: number
        }
        Update: {
          id?: string
          image_url?: string | null
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          address_reference: string | null
          created_at: string
          customer_name: string | null
          delivery_date: string | null
          delivery_method: string
          delivery_slot_id: string | null
          delivery_time: string | null
          discount_total: number
          first_order_discount: number
          guest_token: string
          id: string
          is_guest: boolean
          latitude: number | null
          location_confirmed: boolean
          longitude: number | null
          notes: string | null
          order_number: number
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          phone: string | null
          service_fee: number
          shipping_cost: number
          shipping_zone_id: string | null
          shipping_zone_name: string | null
          status: string
          subtotal_final: number
          subtotal_original: number
          tenant_id: string
          tip: number
          total: number
          user_id: string | null
        }
        Insert: {
          address?: string | null
          address_reference?: string | null
          created_at?: string
          customer_name?: string | null
          delivery_date?: string | null
          delivery_method?: string
          delivery_slot_id?: string | null
          delivery_time?: string | null
          discount_total?: number
          first_order_discount?: number
          guest_token?: string
          id?: string
          is_guest?: boolean
          latitude?: number | null
          location_confirmed?: boolean
          longitude?: number | null
          notes?: string | null
          order_number?: number
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone?: string | null
          service_fee?: number
          shipping_cost?: number
          shipping_zone_id?: string | null
          shipping_zone_name?: string | null
          status?: string
          subtotal_final?: number
          subtotal_original?: number
          tenant_id: string
          tip?: number
          total?: number
          user_id?: string | null
        }
        Update: {
          address?: string | null
          address_reference?: string | null
          created_at?: string
          customer_name?: string | null
          delivery_date?: string | null
          delivery_method?: string
          delivery_slot_id?: string | null
          delivery_time?: string | null
          discount_total?: number
          first_order_discount?: number
          guest_token?: string
          id?: string
          is_guest?: boolean
          latitude?: number | null
          location_confirmed?: boolean
          longitude?: number | null
          notes?: string | null
          order_number?: number
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone?: string | null
          service_fee?: number
          shipping_cost?: number
          shipping_zone_id?: string | null
          shipping_zone_name?: string | null
          status?: string
          subtotal_final?: number
          subtotal_original?: number
          tenant_id?: string
          tip?: number
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_slot_id_fkey"
            columns: ["delivery_slot_id"]
            isOneToOne: false
            referencedRelation: "delivery_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_zone_id_fkey"
            columns: ["shipping_zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: number
          monthly_subscription_price: number
          payment_alias: string
          updated_at: string
          whatsapp_contact_number: string
        }
        Insert: {
          created_at?: string
          id?: number
          monthly_subscription_price?: number
          payment_alias?: string
          updated_at?: string
          whatsapp_contact_number?: string
        }
        Update: {
          created_at?: string
          id?: number
          monthly_subscription_price?: number
          payment_alias?: string
          updated_at?: string
          whatsapp_contact_number?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          emoji: string
          id: string
          image_url: string | null
          images: string[]
          is_active: boolean
          name: string
          price: number
          promo_buy_qty: number | null
          promo_pay_qty: number | null
          promo_percent: number | null
          promo_type: string
          sale_price: number | null
          sold_count: number
          stock: number
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          images?: string[]
          is_active?: boolean
          name: string
          price: number
          promo_buy_qty?: number | null
          promo_pay_qty?: number | null
          promo_percent?: number | null
          promo_type?: string
          sale_price?: number | null
          sold_count?: number
          stock?: number
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          images?: string[]
          is_active?: boolean
          name?: string
          price?: number
          promo_buy_qty?: number | null
          promo_pay_qty?: number | null
          promo_percent?: number | null
          promo_type?: string
          sale_price?: number | null
          sold_count?: number
          stock?: number
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          first_order_discount_order_id: string | null
          first_order_discount_used: boolean
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          first_order_discount_order_id?: string | null
          first_order_discount_used?: boolean
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          first_order_discount_order_id?: string | null
          first_order_discount_used?: boolean
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          polygon: Json
          shipping_cost: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          polygon?: Json
          shipping_cost?: number
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          polygon?: Json
          shipping_cost?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_user_id: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_user_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_use_tenant_folder: { Args: { _folder: string }; Returns: boolean }
      consume_stock: { Args: { _items: Json }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      my_tenant_id: { Args: { _user_id: string }; Returns: string }
      tenant_is_public: { Args: { _tenant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      tenant_status:
        | "pending"
        | "active"
        | "suspended"
        | "trial"
        | "subscription_active"
        | "subscription_expired"
        | "pending_payment"
        | "pending_approval"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      tenant_status: [
        "pending",
        "active",
        "suspended",
        "trial",
        "subscription_active",
        "subscription_expired",
        "pending_payment",
        "pending_approval",
      ],
    },
  },
} as const
