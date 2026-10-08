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
          status: string
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          field: string
          note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          field?: string
          note?: string | null
          status?: string
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
      badges: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          ref: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          ref: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          ref?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          blocked_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          blocked_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          cert_key: string | null
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
          cert_key?: string | null
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
          cert_key?: string | null
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
      competition_results: {
        Row: {
          competition_id: string
          correctness: number
          coverage: number
          created_at: string
          details: Json
          eliminated: string | null
          hidden_passed: number
          hidden_total: number
          points: number
          quality: number
          team_id: string
          teamwork: number
          tests: Json
        }
        Insert: {
          competition_id: string
          correctness?: number
          coverage?: number
          created_at?: string
          details?: Json
          eliminated?: string | null
          hidden_passed?: number
          hidden_total?: number
          points?: number
          quality?: number
          team_id: string
          teamwork?: number
          tests?: Json
        }
        Update: {
          competition_id?: string
          correctness?: number
          coverage?: number
          created_at?: string
          details?: Json
          eliminated?: string | null
          hidden_passed?: number
          hidden_total?: number
          points?: number
          quality?: number
          team_id?: string
          teamwork?: number
          tests?: Json
        }
        Relationships: [
          {
            foreignKeyName: "competition_results_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          apply_deadline: string
          brief: string[]
          calibration: string | null
          cancel_reason: string | null
          code: string
          created_at: string
          deliverables: string[]
          description: string
          difficulty: string
          end_date: string
          id: string
          is_demo: boolean
          locked: boolean
          positions: Json
          publish_on: string | null
          spec: Json
          spec_id: string | null
          start_date: string
          status: string
          tagline: string
          tests: Json
          tests_verified_at: string | null
          theme: string
          title: string
        }
        Insert: {
          apply_deadline: string
          brief?: string[]
          calibration?: string | null
          cancel_reason?: string | null
          code: string
          created_at?: string
          deliverables?: string[]
          description?: string
          difficulty?: string
          end_date: string
          id: string
          is_demo?: boolean
          locked?: boolean
          positions?: Json
          publish_on?: string | null
          spec?: Json
          spec_id?: string | null
          start_date: string
          status: string
          tagline?: string
          tests?: Json
          tests_verified_at?: string | null
          theme?: string
          title: string
        }
        Update: {
          apply_deadline?: string
          brief?: string[]
          calibration?: string | null
          cancel_reason?: string | null
          code?: string
          created_at?: string
          deliverables?: string[]
          description?: string
          difficulty?: string
          end_date?: string
          id?: string
          is_demo?: boolean
          locked?: boolean
          positions?: Json
          publish_on?: string | null
          spec?: Json
          spec_id?: string | null
          start_date?: string
          status?: string
          tagline?: string
          tests?: Json
          tests_verified_at?: string | null
          theme?: string
          title?: string
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          created_at: string
          from_id: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      credentials: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          ref: string
          status: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          ref: string
          status?: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          ref?: string
          status?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_runs: {
        Row: {
          competition_id: string
          finished_at: string | null
          id: string
          kind: string
          nonce_hash: string
          requested_at: string
          status: string
          team_id: string | null
        }
        Insert: {
          competition_id: string
          finished_at?: string | null
          id?: string
          kind: string
          nonce_hash: string
          requested_at?: string
          status?: string
          team_id?: string | null
        }
        Update: {
          competition_id?: string
          finished_at?: string | null
          id?: string
          kind?: string
          nonce_hash?: string
          requested_at?: string
          status?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      gemini_usage: {
        Row: {
          count: number
          day: string
          kind: string
        }
        Insert: {
          count?: number
          day: string
          kind: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
        }
        Relationships: []
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
          from_league: string | null
          from_user: string | null
          id: string
          note: string | null
          stars: number
          team_id: string
          to_user: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          from_league?: string | null
          from_user?: string | null
          id?: string
          note?: string | null
          stars: number
          team_id: string
          to_user: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          from_league?: string | null
          from_user?: string | null
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
          is_admin: boolean
          kvkk_accepted_at: string | null
          league: string
          name: string
          school: string
          score: number
          season_points: number
          season_points_at: string | null
          skills: Json
          suspended: boolean
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
          is_admin?: boolean
          kvkk_accepted_at?: string | null
          league?: string
          name: string
          school?: string
          score?: number
          season_points?: number
          season_points_at?: string | null
          skills?: Json
          suspended?: boolean
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
          is_admin?: boolean
          kvkk_accepted_at?: string | null
          league?: string
          name?: string
          school?: string
          score?: number
          season_points?: number
          season_points_at?: string | null
          skills?: Json
          suspended?: boolean
          username?: string
        }
        Relationships: []
      }
      project_analysis_cache: {
        Row: {
          commit_sha: string
          created_at: string
          difficulty: string
          model: string
          reasons: Json
          repo: string
        }
        Insert: {
          commit_sha: string
          created_at?: string
          difficulty: string
          model?: string
          reasons: Json
          repo: string
        }
        Update: {
          commit_sha?: string
          created_at?: string
          difficulty?: string
          model?: string
          reasons?: Json
          repo?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          blob_sha: string
          project_id: string
          user_id: string
        }
        Insert: {
          blob_sha: string
          project_id: string
          user_id: string
        }
        Update: {
          blob_sha?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          analysis: Json
          analyzed_at: string | null
          commit_sha: string | null
          created_at: string
          demo_url: string | null
          description: string
          id: string
          language: string
          name: string
          points: number
          reasons: Json
          repo_name: string
          repo_owner: string
          role: string
          status: string
          techs: string[]
          user_id: string
        }
        Insert: {
          analysis: Json
          analyzed_at?: string | null
          commit_sha?: string | null
          created_at?: string
          demo_url?: string | null
          description: string
          id?: string
          language?: string
          name: string
          points?: number
          reasons?: Json
          repo_name: string
          repo_owner: string
          role: string
          status?: string
          techs?: string[]
          user_id: string
        }
        Update: {
          analysis?: Json
          analyzed_at?: string | null
          commit_sha?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string
          id?: string
          language?: string
          name?: string
          points?: number
          reasons?: Json
          repo_name?: string
          repo_owner?: string
          role?: string
          status?: string
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
          key: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          key?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          key?: string | null
          user_id?: string | null
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
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          status: string
          target_id: string
          target_type: string
          target_user: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string
          target_id: string
          target_type: string
          target_user?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_fkey"
            columns: ["target_user"]
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
          ref: string | null
          season_id: number | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          points: number
          ref?: string | null
          season_id?: number | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          points?: number
          ref?: string | null
          season_id?: number | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_results: {
        Row: {
          champion: boolean
          from_league: string
          rank: number
          season_id: number
          season_points: number
          seen: boolean
          to_league: string
          user_id: string
        }
        Insert: {
          champion?: boolean
          from_league: string
          rank: number
          season_id: number
          season_points: number
          seen?: boolean
          to_league: string
          user_id: string
        }
        Update: {
          champion?: boolean
          from_league?: string
          rank?: number
          season_id?: number
          season_points?: number
          seen?: boolean
          to_league?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          closed_at: string | null
          ends_at: string
          id: number
          name: string
          starts_at: string
        }
        Insert: {
          closed_at?: string | null
          ends_at: string
          id: number
          name: string
          starts_at: string
        }
        Update: {
          closed_at?: string | null
          ends_at?: string
          id?: number
          name?: string
          starts_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          commits: number | null
          competition_id: string
          field: string
          league: string | null
          points: number
          team_id: string
          user_id: string
        }
        Insert: {
          commits?: number | null
          competition_id: string
          field: string
          league?: string | null
          points?: number
          team_id: string
          user_id: string
        }
        Update: {
          commits?: number | null
          competition_id?: string
          field?: string
          league?: string | null
          points?: number
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
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          team_id: string
          text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          team_id?: string
          text?: string
          user_id?: string | null
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
          created_at: string
          demo_url: string | null
          frozen_sha: string | null
          id: string
          name: string
          public_run: Json | null
          public_run_at: string | null
          repo_url: string | null
          signals: Json
          submitted_at: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          demo_url?: string | null
          frozen_sha?: string | null
          id?: string
          name: string
          public_run?: Json | null
          public_run_at?: string | null
          repo_url?: string | null
          signals?: Json
          submitted_at?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          demo_url?: string | null
          frozen_sha?: string | null
          id?: string
          name?: string
          public_run?: Json | null
          public_run_at?: string | null
          repo_url?: string | null
          signals?: Json
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
      apply_score_items: {
        Args: { p_items: Json; p_user: string }
        Returns: undefined
      }
      close_season: { Args: { p_season: number }; Returns: Json }
      gemini_take: {
        Args: { p_kind: string; p_limit: number }
        Returns: boolean
      }
      project_overlap: {
        Args: { p_exclude: string; p_shas: string[] }
        Returns: {
          project_id: string
          shared: number
          user_id: string
        }[]
      }
      season_moves: {
        Args: never
        Returns: {
          champion: boolean
          from_league: string
          rank: number
          season_points: number
          to_league: string
          user_id: string
        }[]
      }
      template_shas: { Args: { p_shas: string[] }; Returns: string[] }
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
