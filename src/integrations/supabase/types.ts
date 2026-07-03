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
      ai_prompts: {
        Row: {
          description: string | null
          id: string
          key: string
          prompt: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          prompt: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          prompt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      behavior_logs: {
        Row: {
          child_id: string | null
          context: string | null
          created_at: string | null
          id: string
          parent_id: string | null
          word: string | null
        }
        Insert: {
          child_id?: string | null
          context?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          word?: string | null
        }
        Update: {
          child_id?: string | null
          context?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_profiles: {
        Row: {
          age_range: string
          created_at: string
          favorite_animal: string | null
          favorite_color: string | null
          fears: string | null
          gender: string
          id: string
          language: string
          name: string
          parent_id: string
          preferred_voice: string
          puppet_character: string | null
        }
        Insert: {
          age_range: string
          created_at?: string
          favorite_animal?: string | null
          favorite_color?: string | null
          fears?: string | null
          gender?: string
          id?: string
          language?: string
          name: string
          parent_id: string
          preferred_voice?: string
          puppet_character?: string | null
        }
        Update: {
          age_range?: string
          created_at?: string
          favorite_animal?: string | null
          favorite_color?: string | null
          fears?: string | null
          gender?: string
          id?: string
          language?: string
          name?: string
          parent_id?: string
          preferred_voice?: string
          puppet_character?: string | null
        }
        Relationships: []
      }
      generic_icons: {
        Row: {
          family: string
          key: string
          label: string
        }
        Insert: {
          family: string
          key: string
          label: string
        }
        Update: {
          family?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      listening_sessions: {
        Row: {
          child_id: string | null
          completed: boolean
          duration_seconds: number | null
          id: string
          parent_id: string
          started_at: string
          story_id: string | null
        }
        Insert: {
          child_id?: string | null
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          parent_id: string
          started_at?: string
          story_id?: string | null
        }
        Update: {
          child_id?: string | null
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          parent_id?: string
          started_at?: string
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listening_sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listening_sessions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          age: string | null
          author: string | null
          child_id: string | null
          collection: string | null
          content: string
          cover_key: string
          created_at: string
          duration: number
          expires_at: string | null
          favorite: boolean
          holiday_tag: string | null
          id: string
          is_preset: boolean
          language: string
          mode: string
          parent_id: string | null
          review_status: string
          source_url: string | null
          story_type: string
          subtitle: string | null
          suspended: boolean
          tags: string[]
          title: string
          visible_from: string | null
          visible_until: string | null
        }
        Insert: {
          age?: string | null
          author?: string | null
          child_id?: string | null
          collection?: string | null
          content: string
          cover_key?: string
          created_at?: string
          duration?: number
          expires_at?: string | null
          favorite?: boolean
          holiday_tag?: string | null
          id?: string
          is_preset?: boolean
          language?: string
          mode: string
          parent_id?: string | null
          review_status?: string
          source_url?: string | null
          story_type?: string
          subtitle?: string | null
          suspended?: boolean
          tags?: string[]
          title: string
          visible_from?: string | null
          visible_until?: string | null
        }
        Update: {
          age?: string | null
          author?: string | null
          child_id?: string | null
          collection?: string | null
          content?: string
          cover_key?: string
          created_at?: string
          duration?: number
          expires_at?: string | null
          favorite?: boolean
          holiday_tag?: string | null
          id?: string
          is_preset?: boolean
          language?: string
          mode?: string
          parent_id?: string | null
          review_status?: string
          source_url?: string | null
          story_type?: string
          subtitle?: string | null
          suspended?: boolean
          tags?: string[]
          title?: string
          visible_from?: string | null
          visible_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
