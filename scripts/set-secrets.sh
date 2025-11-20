#!/usr/bin/env bash
# Set repository secrets using GitHub CLI (gh) or write to local .env.local when gh is not available.
# Usage:
#   export REPO=jEFFLEZ/qflush
#   export NPM_TOKEN=...
#   ./scripts/set-secrets.sh

set -euo pipefail
REPO=${REPO:-}
if [ -z "$REPO" ]; then
  # try to detect from git remote (github remote preferred)
  if git remote get-url github >/dev/null 2>&1; then
    REPO=$(git remote get-url github | sed -E 's#.*/([^/]+/[^/]+)(\.git)?$#\1#')
  else
    REPO=$(git remote get-url origin 2>/dev/null | sed -E 's#.*/([^/]+/[^/]+)(\.git)?$#\1#' || true)
  fi
fi
if [ -z "$REPO" ]; then
  echo "ERROR: REPO not set and could not be detected. Set REPO=owner/repo or configure git remote 'github' or 'origin'." >&2
  exit 2
fi

SECRETS=(NPM_TOKEN GUMROAD_TOKEN QFLUSH_TOKEN REDIS_URL COPILOT_HMAC_SECRET WEBHOOK_URL GUMROAD_TOKEN_FILE)

GH_AVAILABLE=false
if command -v gh >/dev/null 2>&1; then
  GH_AVAILABLE=true
fi

for key in "${SECRETS[@]}"; do
  # prefer environment variable
  val=""
  if [ ! -z "${!key:-}" ] 2>/dev/null; then
    val="${!key}"
  else
    # prompt user interactively
    read -r -p "Provide value for $key (empty to skip): " input
    val="$input"
  fi

  if [ -z "$val" ]; then
    echo "Skipping $key"
    continue
  fi

  if $GH_AVAILABLE; then
    echo "Setting secret $key in GitHub repo $REPO"
    gh secret set "$key" --body "$val" --repo "$REPO"
  else
    echo "gh CLI not available — writing $key to .env.local (ensure this file is in .gitignore)"
    touch .env.local
    # avoid duplicating key
    grep -v -E "^${key}=" .env.local 2>/dev/null > .env.local.tmp || true
    echo "${key}=${val}" >> .env.local.tmp
    mv .env.local.tmp .env.local
  fi
done

echo "Done."
