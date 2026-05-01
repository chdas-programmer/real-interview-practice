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
      availability_slots: {
        Row: {
          created_at: string
          end_at: string
          id: string
          interviewer_id: string
          is_booked: boolean
          start_at: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          interviewer_id: string
          is_booked?: boolean
          start_at: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          interviewer_id?: string
          is_booked?: boolean
          start_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancellation_reason: string | null
          candidate_id: string
          candidate_joined_at: string | null
          candidate_notes: string | null
          created_at: string
          duration_minutes: number
          dyte_meeting_id: string | null
          end_at: string
          id: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          interviewer_id: string
          interviewer_joined_at: string | null
          meeting_link: string | null
          payment_status: string
          price_cents: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          scheduled_at: string
          slot_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          candidate_id: string
          candidate_joined_at?: string | null
          candidate_notes?: string | null
          created_at?: string
          duration_minutes?: number
          dyte_meeting_id?: string | null
          end_at: string
          id?: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          interviewer_id: string
          interviewer_joined_at?: string | null
          meeting_link?: string | null
          payment_status?: string
          price_cents?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          scheduled_at: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          candidate_id?: string
          candidate_joined_at?: string | null
          candidate_notes?: string | null
          created_at?: string
          duration_minutes?: number
          dyte_meeting_id?: string | null
          end_at?: string
          id?: string
          interview_type?: Database["public"]["Enums"]["interview_type"]
          interviewer_id?: string
          interviewer_joined_at?: string | null
          meeting_link?: string | null
          payment_status?: string
          price_cents?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          scheduled_at?: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          created_at: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          free_session_used: boolean
          resume_url: string | null
          skills: string[] | null
          target_companies: string[] | null
          target_company_tier:
            | Database["public"]["Enums"]["company_tier"]
            | null
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          free_session_used?: boolean
          resume_url?: string | null
          skills?: string[] | null
          target_companies?: string[] | null
          target_company_tier?:
            | Database["public"]["Enums"]["company_tier"]
            | null
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          free_session_used?: boolean
          resume_url?: string | null
          skills?: string[] | null
          target_companies?: string[] | null
          target_company_tier?:
            | Database["public"]["Enums"]["company_tier"]
            | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interviewer_profiles: {
        Row: {
          accepts_resume_reviews: boolean
          bio: string | null
          company: string
          company_tier: Database["public"]["Enums"]["company_tier"]
          created_at: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          expertise: Database["public"]["Enums"]["interview_type"][]
          free_session_used: boolean
          hourly_rate: number
          job_role: string
          linkedin_url: string | null
          updated_at: string
          user_id: string
          verification_notes: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          years_experience: number
        }
        Insert: {
          accepts_resume_reviews?: boolean
          bio?: string | null
          company: string
          company_tier?: Database["public"]["Enums"]["company_tier"]
          created_at?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expertise?: Database["public"]["Enums"]["interview_type"][]
          free_session_used?: boolean
          hourly_rate?: number
          job_role: string
          linkedin_url?: string | null
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number
        }
        Update: {
          accepts_resume_reviews?: boolean
          bio?: string | null
          company?: string
          company_tier?: Database["public"]["Enums"]["company_tier"]
          created_at?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expertise?: Database["public"]["Enums"]["interview_type"][]
          free_session_used?: boolean
          hourly_rate?: number
          job_role?: string
          linkedin_url?: string | null
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
          referral_code: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id: string
          referral_code?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          referral_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          created_at: string
          feedback: string | null
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      interviewer_ratings: {
        Row: {
          avg_rating: number | null
          interviewer_id: string | null
          review_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "candidate" | "interviewer" | "admin"
      booking_status:
        | "pending_confirmation"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "ongoing"
        | "missed"
      company_tier: "product_based" | "service_based" | "startup" | "other"
      experience_level:
        | "entry"
        | "junior"
        | "mid"
        | "senior"
        | "staff"
        | "principal"
      interview_type:
        | "dsa"
        | "system_design"
        | "frontend"
        | "backend"
        | "ml"
        | "behavioral"
        | "hr"
        | "pm"
      verification_status: "pending" | "verified" | "rejected"
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
      app_role: ["candidate", "interviewer", "admin"],
      booking_status: [
        "pending_confirmation",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "ongoing",
        "missed",
      ],
      company_tier: ["product_based", "service_based", "startup", "other"],
      experience_level: [
        "entry",
        "junior",
        "mid",
        "senior",
        "staff",
        "principal",
      ],
      interview_type: [
        "dsa",
        "system_design",
        "frontend",
        "backend",
        "ml",
        "behavioral",
        "hr",
        "pm",
      ],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
