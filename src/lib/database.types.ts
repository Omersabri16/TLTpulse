// Otomatik üretildi: node scripts/setup.mjs types. Elle düzenleme.
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
      applications: {
        Row: {
          competition_id: string
          created_at: string
          field: string
          note: string | null
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          field: string
          note?: string | null
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          field?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          answered_at: string | null
          approver_email: string
          approver_name: string
          comment: string | null
          expires_at: string
          id: string
          points: number
          relation: string
          requested_at: string
          status: string
          target_id: string
          target_label: string
          target_type: string
          token_hash: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          approver_email: string
          approver_name: string
          comment?: string | null
          expires_at: string
          id?: string
          points?: number
          relation: string
          requested_at?: string
          status?: string
          target_id: string
          target_label: string
          target_type: string
          token_hash: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          approver_email?: string
          approver_name?: string
          comment?: string | null
          expires_at?: string
          id?: string
          points?: number
          relation?: string
          requested_at?: string
          status?: string
          target_id?: string
          target_label?: string
          target_type?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          created_at: string
          id: string
          issued_on: string
          link: string
          name: string
          points: number
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_on?: string
          link: string
          name: string
          points?: number
          provider: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_on?: string
          link?: string
          name?: string
          points?: number
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          apply_deadline: string
          brief: string[]
          code: string
          deliverables: string[]
          description: string
          end_date: string
          id: string
          positions: Json
          start_date: string
          status: string
          tagline: string
          theme: string
          title: string
        }
        Insert: {
          apply_deadline: string
          brief?: string[]
          code: string
          deliverables?: string[]
          description?: string
          end_date: string
          id: string
          positions?: Json
          start_date: string
          status: string
          tagline?: string
          theme?: string
          title: string
        }
        Update: {
          apply_deadline?: string
          brief?: string[]
          code?: string
          deliverables?: string[]
          description?: string
          end_date?: string
          id?: string
          positions?: Json
          start_date?: string
          status?: string
          tagline?: string
          theme?: string
          title?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          other_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          other_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          other_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_other_id_fkey"
            columns: ["other_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          created_at: string
          description: string | null
          end_label: string
          id: string
          kind: string
          org: string
          start_label: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_label?: string
          id?: string
          kind: string
          org: string
          start_label?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_label?: string
          id?: string
          kind?: string
          org?: string
          start_label?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: number
          sender_id: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: never
          sender_id: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: never
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          href: string
          id: string
          read: boolean
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          read?: boolean
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          read?: boolean
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_ratings: {
        Row: {
          competition_id: string
          created_at: string
          from_user: string
          id: string
          note: string | null
          stars: number
          team_id: string
          to_user: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          from_user: string
          id?: string
          note?: string | null
          stars: number
          team_id: string
          to_user: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          from_user?: string
          id?: string
          note?: string | null
          stars?: number
          team_id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_ratings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_ratings_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_ratings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_ratings_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string
          city: string
          created_at: string
          cv_code: string
          department: string
          education: Json
          field: string
          github: string
          github_code: string
          github_verified: boolean
          headline: string
          id: string
          interests: string[]
          name: string
          school: string
          score: number
          seed_points: number
          skills: Json
          username: string
        }
        Insert: {
          about?: string
          city?: string
          created_at?: string
          cv_code: string
          department?: string
          education?: Json
          field?: string
          github?: string
          github_code?: string
          github_verified?: boolean
          headline?: string
          id: string
          interests?: string[]
          name: string
          school?: string
          score?: number
          seed_points?: number
          skills?: Json
          username: string
        }
        Update: {
          about?: string
          city?: string
          created_at?: string
          cv_code?: string
          department?: string
          education?: Json
          field?: string
          github?: string
          github_code?: string
          github_verified?: boolean
          headline?: string
          id?: string
          interests?: string[]
          name?: string
          school?: string
          score?: number
          seed_points?: number
          skills?: Json
          username?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          analysis: Json
          created_at: string
          demo_url: string | null
          description: string
          id: string
          language: string
          name: string
          points: number
          repo_name: string
          repo_owner: string
          role: string
          techs: string[]
          user_id: string
        }
        Insert: {
          analysis: Json
          created_at?: string
          demo_url?: string | null
          description: string
          id?: string
          language?: string
          name: string
          points?: number
          repo_name: string
          repo_owner: string
          role: string
          techs?: string[]
          user_id: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          demo_url?: string | null
          description?: string
          id?: string
          language?: string
          name?: string
          points?: number
          repo_name?: string
          repo_owner?: string
          role?: string
          techs?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_events: {
        Row: {
          action: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          baseline: Json
          generated_at: string
          source: string
          steps: Json
          summary: string
          target: string
          user_id: string
        }
        Insert: {
          baseline: Json
          generated_at?: string
          source: string
          steps: Json
          summary: string
          target: string
          user_id: string
        }
        Update: {
          baseline?: Json
          generated_at?: string
          source?: string
          steps?: Json
          summary?: string
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      score_events: {
        Row: {
          created_at: string
          id: string
          label: string
          points: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          points: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          points?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          competition_id: string
          field: string
          team_id: string
          user_id: string
        }
        Insert: {
          competition_id: string
          field: string
          team_id: string
          user_id: string
        }
        Update: {
          competition_id?: string
          field?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          created_at: string
          id: number
          team_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          team_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          team_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          competition_id: string
          id: string
          jury_score: number | null
          name: string
          rank: number | null
          repo_url: string | null
          submitted_at: string | null
        }
        Insert: {
          competition_id: string
          id?: string
          jury_score?: number | null
          name: string
          rank?: number | null
          repo_url?: string | null
          submitted_at?: string | null
        }
        Update: {
          competition_id?: string
          id?: string
          jury_score?: number | null
          name?: string
          rank?: number | null
          repo_url?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
