#!/usr/bin/env bash
# Linux/macOS helper to download, validate, extract and configure a GitHub Actions self-hosted runner.
# Usage:
#   ./scripts/setup-actions-runner.sh <repo-url> <token> [dest-root] [version]
# Example:
#   ./scripts/setup-actions-runner.sh https://github.com/jEFFLEZ/qflush A3435IW5... /opt/actions-runner 2.329.0

set -euo pipefail
REPO_URL=${1:-}
TOKEN=${2:-}
DEST_ROOT=${3:-/opt/actions-runner}
VERSION=${4:-2.329.0}
ARCH="linux-x64"
UNAME=$(uname | tr '[:upper:]' '[:lower:]')
if [ "$UNAME" = "darwin" ]; then
  ARCH="osx-x64"
fi
ZIP_NAME="actions-runner-${ARCH}-${VERSION}.tar.gz"
DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${VERSION}/${ZIP_NAME}"

if [ -z "$REPO_URL" ] || [ -z "$TOKEN" ]; then
  echo "Usage: $0 <repo-url> <token> [dest-root] [version]"
  exit 2
fi

mkdir -p "$DEST_ROOT"
cd "$DEST_ROOT"

echo "Downloading $DOWNLOAD_URL to $ZIP_NAME..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL -o "$ZIP_NAME" "$DOWNLOAD_URL"
else
  wget -qO "$ZIP_NAME" "$DOWNLOAD_URL"
fi

# Optional: checksum validation can be added by the user

echo "Extracting $ZIP_NAME..."
if [[ "$ZIP_NAME" == *.zip ]]; then
  unzip -q "$ZIP_NAME"
else
  tar xzf "$ZIP_NAME"
fi

if [ ! -f ./config.sh ]; then
  echo "config.sh not found after extraction" >&2
  exit 1
fi

echo "Configuring runner for repo: $REPO_URL"
./config.sh --url "$REPO_URL" --token "$TOKEN"

cat <<EOF
Runner configured in: $DEST_ROOT
To run interactively:
  cd $DEST_ROOT
  ./run.sh

To install as a service (Linux/macOS):
  sudo ./svc.sh install
  sudo ./svc.sh start

Note: keep your registration token secret. To remove the runner, use:
  ./config.sh remove --token <token>
EOF
