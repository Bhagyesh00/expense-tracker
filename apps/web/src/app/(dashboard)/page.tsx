"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { DashboardHome } from "./dashboard-home";

export default function DashboardPage() {
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "there";
        setUserName(name);
      }
    });
  }, []);

  return <DashboardHome userName={userName} />;
}
