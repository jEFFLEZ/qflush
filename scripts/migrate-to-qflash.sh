#!/usr/bin/env bash
# Usage: ./migrate-to-qflash.sh /path/to/project
set -e
PROJ=${1:-.}
cd "$PROJ"

echo "Installing @funeste38/qflash..."
npm install @funeste38/qflash --save

# Replace imports (simple sed replace) - backup first
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) -print0 | xargs -0 sed -i.bak "s/from '@funeste38\/rome'/from '@funeste38\/qflash'/g"
find . -type f -name "*.bak" -delete

echo "Migration done. Please review and run tests."