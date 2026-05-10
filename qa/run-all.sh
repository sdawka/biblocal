#!/usr/bin/env bash
# biblocal QA Test Suite
# Runs all user journey tests using agent-browser

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════╗"
echo "║       biblocal QA Test Suite                  ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Check prerequisites
command -v agent-browser >/dev/null 2>&1 || {
  echo "Error: agent-browser is required but not installed."
  exit 1
}

# Check if dev server is running
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/ | grep -q "200\|302"; then
  echo "Warning: Dev server may not be running on localhost:4321"
  echo "Start it with: npm run dev"
  echo ""
fi

# Close any existing browser session
agent-browser close >/dev/null 2>&1 || true

# Configuration
export BASE_URL="${BASE_URL:-http://localhost:4321}"
export TEST_EMAIL="${TEST_EMAIL:-qa+clerk_test@example.com}"
export TEST_PASSWORD="${TEST_PASSWORD:-biblocalqa}"
export TEST_VERIFY_CODE="${TEST_VERIFY_CODE:-424242}"

echo "Config:"
echo "  BASE_URL: $BASE_URL"
echo "  TEST_EMAIL: $TEST_EMAIL"
echo ""

# Track results
PASSED=0
FAILED=0
JOURNEYS=()

run_journey() {
  local name="$1"
  local script="$2"

  echo ""
  if bash "$script"; then
    ((PASSED++))
    JOURNEYS+=("✓ $name")
  else
    ((FAILED++))
    JOURNEYS+=("✗ $name")
  fi

  # Close browser between journeys for clean state
  agent-browser close >/dev/null 2>&1 || true
}

# Run journeys
run_journey "Authentication" "$SCRIPT_DIR/journeys/01-auth.sh"
run_journey "Shelf Operations" "$SCRIPT_DIR/journeys/02-shelf.sh"
run_journey "Profile" "$SCRIPT_DIR/journeys/03-profile.sh"
run_journey "Matches" "$SCRIPT_DIR/journeys/04-matches.sh"
run_journey "Navigation" "$SCRIPT_DIR/journeys/05-navigation.sh"

# Summary
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║              Test Summary                     ║"
echo "╚═══════════════════════════════════════════════╝"
for j in "${JOURNEYS[@]}"; do
  echo "  $j"
done
echo ""
echo "Passed: $PASSED  Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
