import type { Theme } from '../enums';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  default_currency: string;
  default_workspace_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: Theme;
  pin_enabled: boolean;
  pin_hash: string | null;
  biometric_enabled: boolean;
  notifications_enabled: boolean;
  push_enabled: boolean;
  email_notifications_enabled: boolean;
  reminder_time: string | null;
  budget_alert_threshold: number;
  weekly_summary_enabled: boolean;
  monthly_summary_enabled: boolean;
  language: string;
  date_format: string;
  number_format: string;
  created_at: string;
  updated_at: string;
}
