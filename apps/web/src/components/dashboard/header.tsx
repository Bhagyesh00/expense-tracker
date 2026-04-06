"use client";

import { useUIStore } from "@/stores/ui-store";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { Menu, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";

interface HeaderProps {
  user: {
    email?: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const { setSidebarOpen } = useUIStore();
  const client = createBrowserClient();

  const { data: userData } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await client.auth.getUser();
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:w-64"
          onClick={() => {
            // TODO: open command palette / search modal
          }}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            /
          </kbd>
        </button>

        {/* Notifications bell */}
        {userData?.id ? (
          <NotificationBell userId={userData.id} />
        ) : (
          <div className="h-9 w-9 rounded-md" />
        )}

        {/* User menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
