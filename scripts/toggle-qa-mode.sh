#!/usr/bin/env bash
# Toggle between QA mode and normal mode for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEV_VARS="$PROJECT_DIR/.dev.vars"
DEV_VARS_BACKUP="$PROJECT_DIR/.dev.vars.backup"
DEV_VARS_QA="$PROJECT_DIR/.dev.vars.qa"

if grep -q "QA_MODE=true" "$DEV_VARS" 2>/dev/null; then
  # Currently in QA mode, switch to normal
  echo "→ Switching to normal mode..."
  if [ -f "$DEV_VARS_BACKUP" ]; then
    mv "$DEV_VARS_BACKUP" "$DEV_VARS"
    echo "✓ Restored .dev.vars from backup"
  else
    echo "⚠ No backup found. Removing QA settings..."
    grep -v "^QA_MODE=" "$DEV_VARS" | grep -v "^QA_USER_ID=" > "$DEV_VARS.tmp"
    mv "$DEV_VARS.tmp" "$DEV_VARS"
  fi
  echo "✓ Normal mode active (Clerk auth enabled)"
else
  # Currently in normal mode, switch to QA
  echo "→ Switching to QA mode..."

  # Backup current .dev.vars
  cp "$DEV_VARS" "$DEV_VARS_BACKUP"
  echo "✓ Backed up .dev.vars"

  # Add QA settings
  cat >> "$DEV_VARS" << 'EOF'

# QA Mode settings
QA_MODE=true
QA_USER_ID=qa-test-user
EOF

  echo "✓ QA mode active (no auth required)"
fi

echo ""
echo "Restart the dev server for changes to take effect:"
echo "  npm run dev"
