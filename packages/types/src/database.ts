// =============================================================================
// ExpenseFlow — Supabase Database Types
// Generated from migrations 00001 through 00011
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // =====================================================================
      // profiles (00001)
      // =====================================================================
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          default_currency: string;
          locale: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          default_currency?: string;
          locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          default_currency?: string;
          locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // user_settings (00001)
      // =====================================================================
      user_settings: {
        Row: {
          user_id: string;
          theme: string;
          pin_hash: string | null;
          pin_enabled: boolean;
          biometric_enabled: boolean;
          push_enabled: boolean;
          email_notifications: boolean;
          reminder_days_before: number;
          weekly_summary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          pin_hash?: string | null;
          pin_enabled?: boolean;
          biometric_enabled?: boolean;
          push_enabled?: boolean;
          email_notifications?: boolean;
          reminder_days_before?: number;
          weekly_summary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: string;
          pin_hash?: string | null;
          pin_enabled?: boolean;
          biometric_enabled?: boolean;
          push_enabled?: boolean;
          email_notifications?: boolean;
          reminder_days_before?: number;
          weekly_summary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // workspaces (00001)
      // =====================================================================
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          default_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // workspace_members (00001)
      // =====================================================================
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // categories (00001)
      // =====================================================================
      categories: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          icon: string;
          color: string;
          type: string;
          is_system: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          name: string;
          icon?: string;
          color?: string;
          type?: string;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          name?: string;
          icon?: string;
          color?: string;
          type?: string;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // subcategories (00001)
      // =====================================================================
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // contacts (00001)
      // =====================================================================
      contacts: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          upi_id: string | null;
          avatar_url: string | null;
          notes: string | null;
          linked_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          upi_id?: string | null;
          avatar_url?: string | null;
          notes?: string | null;
          linked_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          upi_id?: string | null;
          avatar_url?: string | null;
          notes?: string | null;
          linked_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // expenses (00001 + 00006 void columns + 00010 approval_status)
      // =====================================================================
      expenses: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          type: string;
          amount: number;
          currency: string;
          amount_inr: number | null;
          exchange_rate: number | null;
          category_id: string | null;
          subcategory_id: string | null;
          description: string;
          notes: string | null;
          receipt_url: string | null;
          receipt_ocr_data: Json | null;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          expense_date: string;
          tags: string[];
          is_recurring: boolean;
          recurrence_interval: string | null;
          recurrence_end_date: string | null;
          parent_recurring_id: string | null;
          is_split: boolean;
          split_group_id: string | null;
          split_method: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          // 00006 void columns
          is_voided: boolean;
          voided_at: string | null;
          void_reason: string | null;
          voided_by: string | null;
          // 00010 approval status
          approval_status: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          type?: string;
          amount: number;
          currency?: string;
          amount_inr?: number | null;
          exchange_rate?: number | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          description: string;
          notes?: string | null;
          receipt_url?: string | null;
          receipt_ocr_data?: Json | null;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          expense_date?: string;
          tags?: string[];
          is_recurring?: boolean;
          recurrence_interval?: string | null;
          recurrence_end_date?: string | null;
          parent_recurring_id?: string | null;
          is_split?: boolean;
          split_group_id?: string | null;
          split_method?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          is_voided?: boolean;
          voided_at?: string | null;
          void_reason?: string | null;
          voided_by?: string | null;
          approval_status?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          type?: string;
          amount?: number;
          currency?: string;
          amount_inr?: number | null;
          exchange_rate?: number | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          description?: string;
          notes?: string | null;
          receipt_url?: string | null;
          receipt_ocr_data?: Json | null;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          expense_date?: string;
          tags?: string[];
          is_recurring?: boolean;
          recurrence_interval?: string | null;
          recurrence_end_date?: string | null;
          parent_recurring_id?: string | null;
          is_split?: boolean;
          split_group_id?: string | null;
          split_method?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          is_voided?: boolean;
          voided_at?: string | null;
          void_reason?: string | null;
          voided_by?: string | null;
          approval_status?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // expense_history (00001)
      // =====================================================================
      expense_history: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          changes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id: string;
          changes?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          user_id?: string;
          changes?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // expense_splits (00001)
      // =====================================================================
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string | null;
          contact_id: string | null;
          amount: number;
          percentage: number | null;
          is_paid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id?: string | null;
          contact_id?: string | null;
          amount: number;
          percentage?: number | null;
          is_paid?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          user_id?: string | null;
          contact_id?: string | null;
          amount?: number;
          percentage?: number | null;
          is_paid?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // pending_payments (00001 + 00003 reminder columns)
      // =====================================================================
      pending_payments: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          contact_id: string;
          direction: string;
          total_amount: number;
          paid_amount: number;
          currency: string;
          status: string;
          description: string | null;
          notes: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
          settled_at: string | null;
          // 00003 reminder columns
          last_reminder_stage: number;
          last_reminder_sent_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          contact_id: string;
          direction: string;
          total_amount: number;
          paid_amount?: number;
          currency?: string;
          status?: string;
          description?: string | null;
          notes?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          settled_at?: string | null;
          last_reminder_stage?: number;
          last_reminder_sent_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          contact_id?: string;
          direction?: string;
          total_amount?: number;
          paid_amount?: number;
          currency?: string;
          status?: string;
          description?: string | null;
          notes?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          settled_at?: string | null;
          last_reminder_stage?: number;
          last_reminder_sent_at?: string | null;
        };
        Relationships: [];
      };

      // =====================================================================
      // payment_history (00001)
      // =====================================================================
      payment_history: {
        Row: {
          id: string;
          pending_payment_id: string;
          amount: number;
          payment_method: string | null;
          proof_url: string | null;
          notes: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pending_payment_id: string;
          amount: number;
          payment_method?: string | null;
          proof_url?: string | null;
          notes?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pending_payment_id?: string;
          amount?: number;
          payment_method?: string | null;
          proof_url?: string | null;
          notes?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // budgets (00001 + 00004 last_alert_percent + 00007 rollover columns)
      // =====================================================================
      budgets: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          category_id: string | null;
          amount: number;
          currency: string;
          period: string;
          alert_threshold_percent: number;
          is_active: boolean;
          start_date: string;
          end_date: string | null;
          created_at: string;
          updated_at: string;
          // 00004
          last_alert_percent: number;
          // 00007 rollover columns
          rollover_enabled: boolean;
          rollover_type: string;
          rollover_percentage: number;
          rollover_cap: number | null;
          rollover_amount: number;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          category_id?: string | null;
          amount: number;
          currency?: string;
          period?: string;
          alert_threshold_percent?: number;
          is_active?: boolean;
          start_date?: string;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          last_alert_percent?: number;
          rollover_enabled?: boolean;
          rollover_type?: string;
          rollover_percentage?: number;
          rollover_cap?: number | null;
          rollover_amount?: number;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          category_id?: string | null;
          amount?: number;
          currency?: string;
          period?: string;
          alert_threshold_percent?: number;
          is_active?: boolean;
          start_date?: string;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          last_alert_percent?: number;
          rollover_enabled?: boolean;
          rollover_type?: string;
          rollover_percentage?: number;
          rollover_cap?: number | null;
          rollover_amount?: number;
        };
        Relationships: [];
      };

      // =====================================================================
      // savings_goals (00001 + 00004 fund_additions)
      // =====================================================================
      savings_goals: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          currency: string;
          target_date: string | null;
          icon: string | null;
          color: string | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
          // 00004
          fund_additions: Json;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          currency?: string;
          target_date?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
          fund_additions?: Json;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          currency?: string;
          target_date?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
          fund_additions?: Json;
        };
        Relationships: [];
      };

      // =====================================================================
      // notifications (00001)
      // =====================================================================
      notifications: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string | null;
          type: string;
          title: string;
          body: string;
          data: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id?: string | null;
          type: string;
          title: string;
          body: string;
          data?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string | null;
          type?: string;
          title?: string;
          body?: string;
          data?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // push_tokens (00001)
      // =====================================================================
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // audit_log (00001)
      // =====================================================================
      audit_log: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // currency_rates (00001) — composite PK (base_currency, target_currency)
      // =====================================================================
      currency_rates: {
        Row: {
          base_currency: string;
          target_currency: string;
          rate: number;
          fetched_at: string;
        };
        Insert: {
          base_currency: string;
          target_currency: string;
          rate: number;
          fetched_at?: string;
        };
        Update: {
          base_currency?: string;
          target_currency?: string;
          rate?: number;
          fetched_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // ai_cache (00001 + 00005 workspace_id, query_hash)
      // =====================================================================
      ai_cache: {
        Row: {
          id: string;
          cache_key: string;
          cache_type: string;
          data: Json;
          expires_at: string;
          created_at: string;
          // 00005
          workspace_id: string | null;
          query_hash: string | null;
        };
        Insert: {
          id?: string;
          cache_key: string;
          cache_type: string;
          data?: Json;
          expires_at: string;
          created_at?: string;
          workspace_id?: string | null;
          // query_hash is GENERATED ALWAYS, cannot be inserted
        };
        Update: {
          id?: string;
          cache_key?: string;
          cache_type?: string;
          data?: Json;
          expires_at?: string;
          created_at?: string;
          workspace_id?: string | null;
          // query_hash is GENERATED ALWAYS, cannot be updated
        };
        Relationships: [];
      };

      // =====================================================================
      // invitations (00002)
      // =====================================================================
      invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: string;
          invited_by: string;
          token: string;
          status: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role?: string;
          invited_by: string;
          token: string;
          status?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          role?: string;
          invited_by?: string;
          token?: string;
          status?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // ai_insights (00005)
      // =====================================================================
      ai_insights: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          type: string;
          title: string;
          description: string;
          supporting_data: Json;
          recommendation: string;
          severity: string;
          is_dismissed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          type: string;
          title: string;
          description: string;
          supporting_data?: Json;
          recommendation?: string;
          severity?: string;
          is_dismissed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          description?: string;
          supporting_data?: Json;
          recommendation?: string;
          severity?: string;
          is_dismissed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // expense_templates (00006)
      // =====================================================================
      expense_templates: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          name: string;
          description: string | null;
          amount: number | null;
          is_variable_amount: boolean;
          currency: string;
          category_id: string | null;
          subcategory_id: string | null;
          type: string;
          tags: string[];
          notes: string | null;
          icon: string | null;
          use_count: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          name: string;
          description?: string | null;
          amount?: number | null;
          is_variable_amount?: boolean;
          currency?: string;
          category_id?: string | null;
          subcategory_id?: string | null;
          type?: string;
          tags?: string[];
          notes?: string | null;
          icon?: string | null;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          amount?: number | null;
          is_variable_amount?: boolean;
          currency?: string;
          category_id?: string | null;
          subcategory_id?: string | null;
          type?: string;
          tags?: string[];
          notes?: string | null;
          icon?: string | null;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // mileage_logs (00006)
      // =====================================================================
      mileage_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          from_location: string;
          to_location: string;
          distance_km: number;
          rate_per_km: number;
          amount: number;
          purpose: string | null;
          trip_date: string;
          expense_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          from_location: string;
          to_location: string;
          distance_km: number;
          rate_per_km?: number;
          // amount is GENERATED ALWAYS, cannot be inserted
          purpose?: string | null;
          trip_date?: string;
          expense_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          from_location?: string;
          to_location?: string;
          distance_km?: number;
          rate_per_km?: number;
          // amount is GENERATED ALWAYS, cannot be updated
          purpose?: string | null;
          trip_date?: string;
          expense_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // recurring_payment_templates (00006)
      // =====================================================================
      recurring_payment_templates: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          contact_id: string | null;
          contact_name: string;
          direction: string;
          amount: number;
          currency: string;
          description: string | null;
          recurrence_interval: string;
          start_date: string;
          end_date: string | null;
          next_due_date: string;
          is_active: boolean;
          auto_generate: boolean;
          auto_generate_days_before: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          contact_id?: string | null;
          contact_name: string;
          direction: string;
          amount: number;
          currency?: string;
          description?: string | null;
          recurrence_interval: string;
          start_date?: string;
          end_date?: string | null;
          next_due_date: string;
          is_active?: boolean;
          auto_generate?: boolean;
          auto_generate_days_before?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          contact_id?: string | null;
          contact_name?: string;
          direction?: string;
          amount?: number;
          currency?: string;
          description?: string | null;
          recurrence_interval?: string;
          start_date?: string;
          end_date?: string | null;
          next_due_date?: string;
          is_active?: boolean;
          auto_generate?: boolean;
          auto_generate_days_before?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // expense_comments (00006)
      // =====================================================================
      expense_comments: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          content: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id: string;
          content: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          user_id?: string;
          content?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // net_worth_entries (00007)
      // =====================================================================
      net_worth_entries: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          entry_type: string;
          category: string;
          name: string;
          value: number;
          currency: string;
          value_inr: number;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          entry_type: string;
          category: string;
          name: string;
          value?: number;
          currency?: string;
          value_inr?: number;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          entry_type?: string;
          category?: string;
          name?: string;
          value?: number;
          currency?: string;
          value_inr?: number;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // net_worth_snapshots (00007)
      // =====================================================================
      net_worth_snapshots: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          snapshot_date: string;
          total_assets: number;
          total_liabilities: number;
          net_worth: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          snapshot_date: string;
          total_assets?: number;
          total_liabilities?: number;
          // net_worth is GENERATED ALWAYS, cannot be inserted
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          snapshot_date?: string;
          total_assets?: number;
          total_liabilities?: number;
          // net_worth is GENERATED ALWAYS, cannot be updated
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // detected_subscriptions (00007)
      // =====================================================================
      detected_subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          merchant_name: string;
          average_amount: number;
          currency: string;
          detected_interval: string;
          last_charged_at: string | null;
          next_expected_at: string | null;
          transaction_count: number;
          is_dismissed: boolean;
          linked_template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          merchant_name: string;
          average_amount: number;
          currency?: string;
          detected_interval: string;
          last_charged_at?: string | null;
          next_expected_at?: string | null;
          transaction_count?: number;
          is_dismissed?: boolean;
          linked_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          merchant_name?: string;
          average_amount?: number;
          currency?: string;
          detected_interval?: string;
          last_charged_at?: string | null;
          next_expected_at?: string | null;
          transaction_count?: number;
          is_dismissed?: boolean;
          linked_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // webhooks (00008)
      // =====================================================================
      webhooks: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          url: string;
          secret: string;
          events: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          url: string;
          secret: string;
          events?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          url?: string;
          secret?: string;
          events?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // webhook_deliveries (00008)
      // =====================================================================
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          status: string;
          response_code: number | null;
          response_body: string | null;
          attempts: number;
          next_retry_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event_type: string;
          payload?: Json;
          status?: string;
          response_code?: number | null;
          response_body?: string | null;
          attempts?: number;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event_type?: string;
          payload?: Json;
          status?: string;
          response_code?: number | null;
          response_body?: string | null;
          attempts?: number;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // integrations (00008)
      // =====================================================================
      integrations: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          config: Json;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: string;
          config?: Json;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          config?: Json;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // api_keys (00008)
      // =====================================================================
      api_keys: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          key_hash: string;
          prefix: string;
          scopes: string[];
          last_used_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          key_hash: string;
          prefix: string;
          scopes?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          key_hash?: string;
          prefix?: string;
          scopes?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // export_jobs (00008)
      // =====================================================================
      export_jobs: {
        Row: {
          id: string;
          workspace_id: string;
          format: string;
          status: string;
          file_url: string | null;
          filters: Json;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          format: string;
          status?: string;
          file_url?: string | null;
          filters?: Json;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          format?: string;
          status?: string;
          file_url?: string | null;
          filters?: Json;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };

      // =====================================================================
      // bank_connections (00009)
      // =====================================================================
      bank_connections: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          institution_name: string;
          institution_id: string | null;
          account_name: string;
          account_type: string;
          account_mask: string | null;
          access_token_encrypted: string | null;
          status: string;
          last_synced_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: string;
          institution_name: string;
          institution_id?: string | null;
          account_name: string;
          account_type?: string;
          account_mask?: string | null;
          access_token_encrypted?: string | null;
          status?: string;
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          institution_name?: string;
          institution_id?: string | null;
          account_name?: string;
          account_type?: string;
          account_mask?: string | null;
          access_token_encrypted?: string | null;
          status?: string;
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // bank_transactions (00009)
      // =====================================================================
      bank_transactions: {
        Row: {
          id: string;
          workspace_id: string;
          bank_connection_id: string;
          transaction_id: string;
          amount: number;
          currency: string;
          description: string;
          merchant_name: string | null;
          category_hint: string | null;
          date: string;
          status: string;
          is_matched: boolean;
          matched_expense_id: string | null;
          raw_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          bank_connection_id: string;
          transaction_id: string;
          amount: number;
          currency?: string;
          description?: string;
          merchant_name?: string | null;
          category_hint?: string | null;
          date: string;
          status?: string;
          is_matched?: boolean;
          matched_expense_id?: string | null;
          raw_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          bank_connection_id?: string;
          transaction_id?: string;
          amount?: number;
          currency?: string;
          description?: string;
          merchant_name?: string | null;
          category_hint?: string | null;
          date?: string;
          status?: string;
          is_matched?: boolean;
          matched_expense_id?: string | null;
          raw_data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // sms_rules (00009)
      // =====================================================================
      sms_rules: {
        Row: {
          id: string;
          workspace_id: string;
          bank_name: string;
          pattern: string;
          amount_group: number;
          merchant_group: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          bank_name: string;
          pattern: string;
          amount_group?: number;
          merchant_group?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          bank_name?: string;
          pattern?: string;
          amount_group?: number;
          merchant_group?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // bank_statements (00009)
      // =====================================================================
      bank_statements: {
        Row: {
          id: string;
          workspace_id: string;
          file_url: string;
          file_type: string;
          status: string;
          parsed_count: number;
          matched_count: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          file_url: string;
          file_type: string;
          status?: string;
          parsed_count?: number;
          matched_count?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          file_url?: string;
          file_type?: string;
          status?: string;
          parsed_count?: number;
          matched_count?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // sso_configs (00010)
      // =====================================================================
      sso_configs: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          entity_id: string;
          sso_url: string;
          certificate: string;
          metadata_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: string;
          entity_id: string;
          sso_url: string;
          certificate: string;
          metadata_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          entity_id?: string;
          sso_url?: string;
          certificate?: string;
          metadata_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // approval_policies (00010)
      // =====================================================================
      approval_policies: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          conditions: Json;
          approvers: string[];
          require_all: boolean;
          auto_approve_below: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          conditions?: Json;
          approvers?: string[];
          require_all?: boolean;
          auto_approve_below?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          conditions?: Json;
          approvers?: string[];
          require_all?: boolean;
          auto_approve_below?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // approval_requests (00010)
      // =====================================================================
      approval_requests: {
        Row: {
          id: string;
          expense_id: string;
          policy_id: string;
          status: string;
          submitted_by: string;
          submitted_at: string;
          decided_by: string | null;
          decided_at: string | null;
          comments: string | null;
        };
        Insert: {
          id?: string;
          expense_id: string;
          policy_id: string;
          status?: string;
          submitted_by: string;
          submitted_at?: string;
          decided_by?: string | null;
          decided_at?: string | null;
          comments?: string | null;
        };
        Update: {
          id?: string;
          expense_id?: string;
          policy_id?: string;
          status?: string;
          submitted_by?: string;
          submitted_at?: string;
          decided_by?: string | null;
          decided_at?: string | null;
          comments?: string | null;
        };
        Relationships: [];
      };

      // =====================================================================
      // team_policies (00010)
      // =====================================================================
      team_policies: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          rules: Json;
          applies_to_roles: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          rules?: Json;
          applies_to_roles?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          rules?: Json;
          applies_to_roles?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // policy_violations (00010)
      // =====================================================================
      policy_violations: {
        Row: {
          id: string;
          expense_id: string;
          policy_id: string;
          violation_type: string;
          details: string | null;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          policy_id: string;
          violation_type: string;
          details?: string | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          policy_id?: string;
          violation_type?: string;
          details?: string | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // user_locale (00011)
      // =====================================================================
      user_locale: {
        Row: {
          user_id: string;
          locale: string;
          timezone: string;
          date_format: string;
          number_format: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          locale?: string;
          timezone?: string;
          date_format?: string;
          number_format?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          locale?: string;
          timezone?: string;
          date_format?: string;
          number_format?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // translation_overrides (00011)
      // =====================================================================
      translation_overrides: {
        Row: {
          id: string;
          workspace_id: string;
          locale: string;
          key: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          locale: string;
          key: string;
          value: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          locale?: string;
          key?: string;
          value?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // =====================================================================
      // accessibility_settings (00011)
      // =====================================================================
      accessibility_settings: {
        Row: {
          user_id: string;
          high_contrast: boolean;
          reduced_motion: boolean;
          font_scale: number;
          screen_reader_hints: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          high_contrast?: boolean;
          reduced_motion?: boolean;
          font_scale?: number;
          screen_reader_hints?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          high_contrast?: boolean;
          reduced_motion?: boolean;
          font_scale?: number;
          screen_reader_hints?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      is_workspace_member: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      get_workspace_role: {
        Args: { ws_id: string };
        Returns: string;
      };
      ai_execute_query: {
        Args: { query_sql: string; p_workspace_id: string };
        Returns: Json;
      };
      cleanup_expired_ai_cache: {
        Args: Record<string, never>;
        Returns: number;
      };
      expire_old_invitations: {
        Args: Record<string, never>;
        Returns: number;
      };
    };

    Enums: {
      workspace_role: 'owner' | 'admin' | 'member' | 'viewer';
      expense_type: 'expense' | 'income';
      payment_direction: 'give' | 'receive';
      payment_status: 'pending' | 'partial' | 'settled' | 'overdue' | 'cancelled';
      recurrence_interval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
      notification_type: 'payment_reminder' | 'budget_alert' | 'overdue_payment' | 'workspace_invite' | 'system';
      budget_period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      split_method: 'equal' | 'percentage' | 'exact';
      invitation_status: 'pending' | 'accepted' | 'expired';
      insight_type: 'spending_pattern' | 'anomaly' | 'budget_warning' | 'savings_opportunity' | 'forecast';
      insight_severity: 'info' | 'warning' | 'critical';
    };

    CompositeTypes: Record<string, never>;
  };
}

// =============================================================================
// Convenience type helpers
// =============================================================================

/** Shorthand for all public tables */
export type Tables = Database['public']['Tables'];

/** Extract the Row type for a given table name */
export type TableRow<T extends keyof Tables> = Tables[T]['Row'];

/** Extract the Insert type for a given table name */
export type TableInsert<T extends keyof Tables> = Tables[T]['Insert'];

/** Extract the Update type for a given table name */
export type TableUpdate<T extends keyof Tables> = Tables[T]['Update'];

/** Shorthand for all public enums */
export type Enums = Database['public']['Enums'];
