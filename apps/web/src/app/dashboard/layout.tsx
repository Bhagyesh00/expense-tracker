import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userData = {
    email: user.email || "",
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || "",
    avatarUrl: user.user_metadata?.avatar_url || "",
  };

  return <DashboardShell user={userData}>{children}</DashboardShell>;
}
