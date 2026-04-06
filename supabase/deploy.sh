#!/usr/bin/env bash
# =============================================================================
# ExpenseFlow — Supabase deployment script
# Usage:
#   ./supabase/deploy.sh           # defaults to linked project
#   ./supabase/deploy.sh prod      # explicitly target production
#   ./supabase/deploy.sh staging   # target staging project ref
#
# Prerequisites:
#   - supabase CLI installed (https://supabase.com/docs/guides/cli)
#   - Logged in: supabase login
#   - Project linked: supabase link --project-ref <ref>  (or pass SUPABASE_PROJECT_REF)
#   - Required env vars exported (see .env.example)
# =============================================================================

set -euo pipefail

ENV=${1:-""}

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Resolve project ref from argument or env
# ---------------------------------------------------------------------------
resolve_project() {
  if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    log_info "Using SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF"
    supabase link --project-ref "$SUPABASE_PROJECT_REF"
  elif [[ "$ENV" == "prod" || "$ENV" == "production" ]]; then
    if [[ -z "${SUPABASE_PROD_PROJECT_REF:-}" ]]; then
      log_error "Set SUPABASE_PROD_PROJECT_REF or SUPABASE_PROJECT_REF for production deploys."
      exit 1
    fi
    supabase link --project-ref "$SUPABASE_PROD_PROJECT_REF"
  elif [[ "$ENV" == "staging" ]]; then
    if [[ -z "${SUPABASE_STAGING_PROJECT_REF:-}" ]]; then
      log_error "Set SUPABASE_STAGING_PROJECT_REF for staging deploys."
      exit 1
    fi
    supabase link --project-ref "$SUPABASE_STAGING_PROJECT_REF"
  else
    log_info "Using already-linked project (run 'supabase link' first if needed)."
  fi
}

# ---------------------------------------------------------------------------
# Push database migrations
# ---------------------------------------------------------------------------
run_migrations() {
  log_info "Pushing database migrations..."
  supabase db push
  log_success "Migrations applied."
}

# ---------------------------------------------------------------------------
# Deploy all edge functions
# ---------------------------------------------------------------------------
FUNCTIONS=(
  ai-categorize
  budget-alerts
  currency-rates
  invite-member
  mark-overdue
  ocr-receipt
  payment-reminders
  send-notification
  settlement-calc
  user-setup
)

deploy_functions() {
  log_info "Deploying ${#FUNCTIONS[@]} edge functions..."
  for func in "${FUNCTIONS[@]}"; do
    local func_dir="supabase/functions/$func"
    if [[ -d "$func_dir" ]]; then
      echo -n "  Deploying $func ... "
      supabase functions deploy "$func" --no-verify-jwt 2>/dev/null || \
        supabase functions deploy "$func"
      echo -e "${GREEN}done${NC}"
    else
      log_warn "Function directory not found: $func_dir — skipping."
    fi
  done
  log_success "All edge functions deployed."
}

# ---------------------------------------------------------------------------
# Set edge function secrets
# ---------------------------------------------------------------------------
set_secrets() {
  log_info "Setting edge function secrets..."

  local missing=()

  # Validate required secrets
  [[ -z "${GEMINI_API_KEY:-}" ]]                && missing+=("GEMINI_API_KEY")
  [[ -z "${GROQ_API_KEY:-}" ]]                  && missing+=("GROQ_API_KEY")
  [[ -z "${OPEN_EXCHANGE_RATES_APP_ID:-}" ]]    && missing+=("OPEN_EXCHANGE_RATES_APP_ID")
  [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]     && missing+=("SUPABASE_SERVICE_ROLE_KEY")

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required environment variables: ${missing[*]}"
    log_error "Export them before running this script."
    exit 1
  fi

  supabase secrets set \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    GROQ_API_KEY="$GROQ_API_KEY" \
    OPEN_EXCHANGE_RATES_APP_ID="$OPEN_EXCHANGE_RATES_APP_ID" \
    SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

  # Optional secrets
  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    supabase secrets set SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL"
    log_info "  Set SLACK_WEBHOOK_URL"
  fi

  if [[ -n "${RAZORPAY_KEY_SECRET:-}" ]]; then
    supabase secrets set RAZORPAY_KEY_SECRET="$RAZORPAY_KEY_SECRET"
    log_info "  Set RAZORPAY_KEY_SECRET"
  fi

  log_success "Secrets configured."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo ""
  echo "================================================"
  echo "  ExpenseFlow — Supabase Deploy"
  echo "  Environment: ${ENV:-linked project}"
  echo "================================================"
  echo ""

  # Confirm for production
  if [[ "$ENV" == "prod" || "$ENV" == "production" ]]; then
    log_warn "You are deploying to PRODUCTION."
    read -r -p "Type 'yes' to continue: " confirm
    if [[ "$confirm" != "yes" ]]; then
      log_info "Aborted."
      exit 0
    fi
  fi

  resolve_project
  run_migrations
  deploy_functions
  set_secrets

  echo ""
  log_success "Supabase deployment complete!"
  echo ""
}

main "$@"
