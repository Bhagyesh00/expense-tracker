export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar skeleton */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        </div>

        {/* Nav items */}
        <div className="flex-1 space-y-1 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-5 w-5 animate-pulse rounded bg-muted" />
              <div
                className="h-3.5 animate-pulse rounded bg-muted"
                style={{ width: `${50 + Math.floor((i * 13 + 17) % 40)}%` }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div className="h-8 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header skeleton */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 sm:px-6">
          {/* Left: hamburger (mobile) */}
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted lg:hidden" />
          <div className="hidden lg:block" />

          {/* Right: search + bell + avatar */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-muted sm:w-64" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          </div>
        </header>

        {/* Page content skeleton */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page title */}
            <div className="space-y-2">
              <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
            </div>

            {/* Quick actions row */}
            <div className="flex gap-3">
              {[100, 130, 110].map((w, i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-lg bg-muted"
                  style={{ width: w }}
                />
              ))}
            </div>

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-7 w-24 animate-pulse rounded-lg bg-muted" />
                    </div>
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  </div>
                  <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted/60" />
                </div>
              ))}
            </div>

            {/* Content grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main card */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-3.5 w-14 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div
                          className="h-3.5 animate-pulse rounded bg-muted"
                          style={{ width: `${55 + (i * 11) % 35}%` }}
                        />
                        <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
                      </div>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Side cards */}
              <div className="space-y-6">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-border bg-card shadow-sm"
                  >
                    <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                      <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <div
                            className="h-3 animate-pulse rounded bg-muted"
                            style={{ width: `${60 + (i * 17) % 30}%` }}
                          />
                          <div className="h-2 w-full animate-pulse rounded-full bg-muted/60">
                            <div
                              className="h-2 animate-pulse rounded-full bg-primary/20"
                              style={{ width: `${30 + (i * 23) % 50}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
