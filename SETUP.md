# ExpenseFlow Setup Guide

A full-stack expense tracker built with Next.js 14 (web), Expo / React Native (mobile), Supabase (backend), and AI features via Gemini + Groq.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm@10` |
| Supabase CLI | latest | `npm install -g supabase` |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | latest | `npm install -g eas-cli` |
| Git | any | https://git-scm.com |

---

## 1. Clone and install

```bash
git clone https://github.com/your-org/expense-tracker.git
cd expense-tracker
pnpm install
```

---

## 2. Supabase setup

### 2a. Create a Supabase project

1. Go to https://app.supabase.com and create a new project.
2. Note your **Project URL** and **anon key** (Settings → API).
3. Note your **service role key** (Settings → API → service_role — keep this secret).
4. Note your **database password** set during project creation.

### 2b. Run migrations

```bash
# Link your local CLI to the project
supabase link --project-ref <your-project-ref>

# Apply all migrations (creates tables, RLS policies, etc.)
supabase db push

# Optional: seed development data
supabase db seed
```

### 2c. Enable Auth providers

In Supabase dashboard → Authentication → Providers:
- **Email** — enable email + password (enabled by default)
- **Google** — add your OAuth credentials if needed (optional)

### 2d. Configure Auth redirect URLs

In Supabase dashboard → Authentication → URL Configuration:
- Add `http://localhost:3000/api/auth/callback` (development)
- Add `https://your-app.vercel.app/api/auth/callback` (production)

---

## 3. Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → Connection string |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `OPEN_EXCHANGE_RATES_APP_ID` | https://openexchangerates.org/account/app-ids |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_PROJECT_ID` | https://expo.dev → your project → Settings |

---

## 4. AI provider setup

### Gemini (Google AI Studio) — free tier

1. Go to https://aistudio.google.com/app/apikey.
2. Create an API key.
3. Set `GEMINI_API_KEY` in `.env.local`.
4. Free tier: 15 RPM, 1M tokens/day — sufficient for development.

### Groq — free tier

1. Go to https://console.groq.com/keys.
2. Create an API key.
3. Set `GROQ_API_KEY` in `.env.local`.
4. Free tier: generous limits on Llama 3 and Mixtral models.

---

## 5. Run locally

### Web (Next.js)

```bash
pnpm dev:web
# Opens at http://localhost:3000
```

### Mobile (Expo)

```bash
pnpm dev:mobile
# Scan QR code with Expo Go app on your phone
```

### Both simultaneously

```bash
pnpm dev
```

### Run all Supabase services locally (optional)

```bash
supabase start
# Local Studio at http://localhost:54323
# Local API at http://localhost:54321
```

---

## 6. Deploy web to Vercel

### 6a. Create a Vercel project

```bash
# Install Vercel CLI
pnpm add -g vercel

# Link to Vercel (follow prompts)
cd apps/web
vercel link
```

When prompted:
- **Framework**: Next.js (auto-detected)
- **Build command**: leave blank (vercel.json handles it)
- **Output directory**: leave blank

### 6b. Add environment variables in Vercel

In Vercel dashboard → your project → Settings → Environment Variables, add all variables from `.env.example` (without the `#` commented ones).

### 6c. Add GitHub secrets for CI/CD

In GitHub → your repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Account Settings → General → Team ID (or user ID) |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General → Project ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 6d. Deploy

Push to `main` — the `deploy-web.yml` workflow will automatically build and deploy.

Manual deploy:
```bash
cd apps/web
vercel --prod
```

---

## 7. Build mobile APK with EAS

### 7a. Create an Expo account and project

```bash
eas login
eas init   # run from apps/mobile/
```

### 7b. Configure EAS secrets

```bash
cd apps/mobile

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
```

### 7c. Build a preview APK (Android)

```bash
cd apps/mobile
eas build --platform android --profile preview
```

EAS will queue the build on Expo's build servers. When done, a download link is provided.

### 7d. Build production AAB (for Play Store)

```bash
cd apps/mobile
eas build --platform android --profile production
```

### 7e. GitHub Actions build

Trigger manually from GitHub → Actions → Build Mobile → Run workflow.

---

## 8. Deploy Supabase edge functions

```bash
# From the repo root
./supabase/deploy.sh

# Or for production (with confirmation prompt)
./supabase/deploy.sh prod
```

Required environment variables must be exported before running:
```bash
export GEMINI_API_KEY=...
export GROQ_API_KEY=...
export OPEN_EXCHANGE_RATES_APP_ID=...
export SUPABASE_SERVICE_ROLE_KEY=...
./supabase/deploy.sh
```

---

## 9. Production checklist

### Database
- [ ] Run all migrations: `supabase db push`
- [ ] Verify RLS policies are enabled on all tables
- [ ] Set up daily database backups in Supabase dashboard
- [ ] Add production database to monitoring

### Authentication
- [ ] Set correct redirect URLs in Supabase Auth settings
- [ ] Disable "Enable email confirmations" only if not using it
- [ ] Set up custom email templates (Supabase → Auth → Email Templates)

### Web (Vercel)
- [ ] All environment variables are set in Vercel dashboard
- [ ] Custom domain is configured (Vercel → Project → Domains)
- [ ] Preview deployments work for PRs
- [ ] Vercel Analytics enabled (optional)

### Mobile (EAS / Expo)
- [ ] `app.json` has correct `bundleIdentifier` (iOS) and `package` (Android)
- [ ] Push notification credentials configured in EAS
- [ ] App icons and splash screen assets are correct
- [ ] Internal testing build tested on real device before Play Store submission

### Supabase edge functions
- [ ] All functions deployed and secrets set: `./supabase/deploy.sh prod`
- [ ] Test each function from Supabase dashboard → Edge Functions → Logs
- [ ] Currency rates cron configured (Supabase → Database → Cron)

### Security
- [ ] `.env.local` is NOT committed to git
- [ ] Service role key is only in server-side env vars (never `NEXT_PUBLIC_*`)
- [ ] Content Security Policy headers are configured (see `vercel.json`)
- [ ] Rate limiting is in place for API routes

---

## Project structure

```
expense-tracker/
├── apps/
│   ├── web/          # Next.js 14 web app
│   └── mobile/       # Expo / React Native mobile app
├── packages/
│   ├── ai/           # AI categorization, forecasting, insights
│   ├── api/          # TanStack Query hooks (shared web + mobile)
│   ├── config/       # ESLint + TypeScript shared configs
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI component library
│   └── utils/        # Shared utilities (currency, date, validators)
├── supabase/
│   ├── functions/    # Supabase edge functions (Deno)
│   ├── migrations/   # SQL migrations
│   └── deploy.sh     # Deployment helper script
└── .github/
    └── workflows/    # CI, deploy-web, build-mobile pipelines
```

---

## Useful commands

```bash
# Development
pnpm dev                          # Run web + mobile in parallel
pnpm dev:web                      # Web only
pnpm dev:mobile                   # Mobile only

# Code quality
pnpm lint                         # ESLint across all packages
pnpm typecheck                    # TypeScript check across all packages
pnpm format                       # Prettier format

# Database
pnpm db:gen-types                 # Regenerate TypeScript types from Supabase schema
pnpm db:migrate                   # Push migrations
pnpm db:seed                      # Seed development data
pnpm db:reset                     # Reset local database

# Build
pnpm build                        # Build all packages and apps
pnpm turbo build --filter=@expenseflow/web  # Build web only
```
