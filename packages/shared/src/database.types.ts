export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chats: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compatibility_readings: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          language: string
          model: string
          narrative: Json
          numbers: Json
          partner_id: string
          prompt_version: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          language: string
          model: string
          narrative: Json
          numbers: Json
          partner_id: string
          prompt_version: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          language?: string
          model?: string
          narrative?: Json
          numbers?: Json
          partner_id?: string
          prompt_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_readings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      content_meanings: {
        Row: {
          approved: boolean
          body: string
          language: string
          number_type: string
          title: string
          value: number
        }
        Insert: {
          approved?: boolean
          body: string
          language: string
          number_type: string
          title: string
          value: number
        }
        Update: {
          approved?: boolean
          body?: string
          language?: string
          number_type?: string
          title?: string
          value?: number
        }
        Relationships: []
      }
      daily_quotes: {
        Row: {
          batch_id: string
          created_at: string
          for_date: string
          id: string
          language: string
          model: string
          personal_day: number
          prompt_version: string
          shared_at: string | null
          text: string
          theme: string
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          for_date: string
          id?: string
          language: string
          model: string
          personal_day: number
          prompt_version: string
          shared_at?: string | null
          text: string
          theme: string
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          for_date?: string
          id?: string
          language?: string
          model?: string
          personal_day?: number
          prompt_version?: string
          shared_at?: string | null
          text?: string
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          expires_at: string | null
          source: string | null
          tier: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          source?: string | null
          tier?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          source?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_facts: {
        Row: {
          category: string
          created_at: string
          id: string
          last_referenced_at: string
          source_chat_id: string | null
          text: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          last_referenced_at?: string
          source_chat_id?: string | null
          text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_referenced_at?: string
          source_chat_id?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_summaries: {
        Row: {
          facts_hash: string
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          facts_hash?: string
          summary?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          facts_hash?: string
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          prompt_version: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          prompt_version?: string | null
          role: string
          status?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          prompt_version?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          dob: string
          engine_version: string
          full_name: string
          full_name_script: string
          id: string
          label: string
          numbers: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          dob: string
          engine_version: string
          full_name: string
          full_name_script: string
          id?: string
          label: string
          numbers: Json
          user_id: string
        }
        Update: {
          created_at?: string
          dob?: string
          engine_version?: string
          full_name?: string
          full_name_script?: string
          id?: string
          label?: string
          numbers?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dob: string
          engine_version: string
          full_name: string
          full_name_script: string
          goals: string[]
          language: string
          numbers: Json
          relationship_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dob: string
          engine_version: string
          full_name: string
          full_name_script: string
          goals: string[]
          language: string
          numbers: Json
          relationship_status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dob?: string
          engine_version?: string
          full_name?: string
          full_name_script?: string
          goals?: string[]
          language?: string
          numbers?: Json
          relationship_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: number
          kind: string
          version: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: number
          kind: string
          version: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: number
          kind?: string
          version?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          notify_time: string
          platform: string
          token: string
          tz: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_time?: string
          platform: string
          token: string
          tz?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notify_time?: string
          platform?: string
          token?: string
          tz?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_fallbacks: {
        Row: {
          id: number
          language: string
          text: string
          theme: string
        }
        Insert: {
          id?: number
          language: string
          text: string
          theme: string
        }
        Update: {
          id?: number
          language?: string
          text?: string
          theme?: string
        }
        Relationships: []
      }
      spend_daily: {
        Row: {
          date: string
          usd: number
        }
        Insert: {
          date: string
          usd?: number
        }
        Update: {
          date?: string
          usd?: number
        }
        Relationships: []
      }
      usage_daily: {
        Row: {
          date: string
          message_count: number
          user_id: string
        }
        Insert: {
          date: string
          message_count?: number
          user_id: string
        }
        Update: {
          date?: string
          message_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_spend: { Args: { p_usd: number }; Returns: undefined }
      check_and_increment_usage: {
        Args: { p_limit?: number; p_user: string }
        Returns: number
      }
      today_quote: {
        Args: { p_user: string }
        Returns: {
          is_fallback: boolean
          text: string
          theme: string
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

