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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_plans: {
        Row: {
          created_at: string
          event_id: string
          id: string
          plan: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          plan: Json
          source: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          plan?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          allocated: number
          created_at: string
          event_id: string
          id: string
          name: string
          position: number
          spent: number
          user_id: string
        }
        Insert: {
          allocated?: number
          created_at?: string
          event_id: string
          id?: string
          name: string
          position?: number
          spent?: number
          user_id?: string
        }
        Update: {
          allocated?: number
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          position?: number
          spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accessibility: string
          atmosphere: string
          colors: string
          contingency_pct: number
          created_at: string
          currency: string
          duration_hours: number
          event_date: string
          event_type: string
          food_preferences: string
          guest_count: number
          id: string
          is_sample: boolean
          location: string
          special_requests: string
          start_time: string | null
          status: string
          theme: string
          title: string
          total_budget: number
          updated_at: string
          user_id: string
          venue_preference: string
        }
        Insert: {
          accessibility?: string
          atmosphere?: string
          colors?: string
          contingency_pct?: number
          created_at?: string
          currency?: string
          duration_hours?: number
          event_date: string
          event_type: string
          food_preferences?: string
          guest_count: number
          id?: string
          is_sample?: boolean
          location?: string
          special_requests?: string
          start_time?: string | null
          status?: string
          theme?: string
          title: string
          total_budget: number
          updated_at?: string
          user_id?: string
          venue_preference?: string
        }
        Update: {
          accessibility?: string
          atmosphere?: string
          colors?: string
          contingency_pct?: number
          created_at?: string
          currency?: string
          duration_hours?: number
          event_date?: string
          event_type?: string
          food_preferences?: string
          guest_count?: number
          id?: string
          is_sample?: boolean
          location?: string
          special_requests?: string
          start_time?: string | null
          status?: string
          theme?: string
          title?: string
          total_budget?: number
          updated_at?: string
          user_id?: string
          venue_preference?: string
        }
        Relationships: []
      }
      saved_ideas: {
        Row: {
          category: string
          created_at: string
          description: string
          estimated_cost: string
          event_id: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          estimated_cost?: string
          event_id?: string | null
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          estimated_cost?: string
          event_id?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_ideas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          due_date: string | null
          event_id: string
          id: string
          phase: string
          position: number
          priority: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          event_id: string
          id?: string
          phase?: string
          position?: number
          priority?: string
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          event_id?: string
          id?: string
          phase?: string
          position?: number
          priority?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          booking_status: string
          category: string
          contact: string
          created_at: string
          estimated_cost: number
          event_id: string
          id: string
          is_sample: boolean
          name: string
          notes: string
          payment_status: string
          rating: number | null
          user_id: string
        }
        Insert: {
          booking_status?: string
          category: string
          contact?: string
          created_at?: string
          estimated_cost?: number
          event_id: string
          id?: string
          is_sample?: boolean
          name: string
          notes?: string
          payment_status?: string
          rating?: number | null
          user_id?: string
        }
        Update: {
          booking_status?: string
          category?: string
          contact?: string
          created_at?: string
          estimated_cost?: number
          event_id?: string
          id?: string
          is_sample?: boolean
          name?: string
          notes?: string
          payment_status?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_owned: { Args: { _event: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
