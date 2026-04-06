import { createServerClient } from "@/lib/supabase/server";
import { DashboardHome } from "./dashboard-home";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  return <DashboardHome userName={fullName} />;
}
