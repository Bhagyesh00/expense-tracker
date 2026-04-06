"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@expenseflow/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import Link from "next/link";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED", "CHF"];

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("U");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      timezone: "America/New_York",
      defaultCurrency: "USD",
    },
  });

  const watchedName = watch("fullName");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const meta = user.user_metadata || {};
          const name = meta.full_name || meta.name || "";
          setUserEmail(user.email || "");
          setAvatarUrl(meta.avatar_url || null);
          setInitials(
            name
              ? name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : (user.email?.[0]?.toUpperCase() || "U")
          );

          reset({
            fullName: name,
            phone: meta.phone || "",
            timezone: meta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            defaultCurrency: meta.default_currency || "USD",
          });
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [reset]);

  useEffect(() => {
    if (watchedName) {
      setInitials(
        watchedName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      );
    }
  }, [watchedName]);

  const onSubmit = async (data: ProfileInput) => {
    setIsSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          phone: data.phone,
          timezone: data.timezone,
          default_currency: data.defaultCurrency,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated successfully");
        reset(data);
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your personal information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Avatar</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                onClick={() => toast.info("Avatar upload coming soon")}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile photo</p>
              <p className="text-xs text-muted-foreground">
                Click the camera icon to upload a new photo
              </p>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Personal Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                {...register("fullName")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.fullName ? "border-destructive" : "border-input"
                )}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                {...register("phone")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.phone ? "border-destructive" : "border-input"
                )}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Preferences</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Timezone */}
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="text-sm font-medium text-foreground">
                Timezone
              </label>
              <select
                id="timezone"
                {...register("timezone")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors appearance-none",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.timezone ? "border-destructive" : "border-input"
                )}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              {errors.timezone && (
                <p className="text-xs text-destructive">{errors.timezone.message}</p>
              )}
            </div>

            {/* Default Currency */}
            <div className="space-y-1.5">
              <label htmlFor="defaultCurrency" className="text-sm font-medium text-foreground">
                Default currency
              </label>
              <select
                id="defaultCurrency"
                {...register("defaultCurrency")}
                className={cn(
                  "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors appearance-none",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                  errors.defaultCurrency ? "border-destructive" : "border-input"
                )}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.defaultCurrency && (
                <p className="text-xs text-destructive">{errors.defaultCurrency.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
