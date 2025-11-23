#!/usr/bin/env bash
# Open the official GitHub Copilot CLI repository in the default browser
# Usage: ./scripts/open-copilot-cli.sh

REPO_URL="https://github.com/github/copilot-cli"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$REPO_URL" >/dev/null 2>&1 &
  exit 0
fi

if command -v open >/dev/null 2>&1; then
  open "$REPO_URL"
  exit 0
fi

# Fallback to echoing the URL
echo "Open this URL in your browser: $REPO_URL"
exit 0
