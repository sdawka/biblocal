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

# Configuration
export BASE_URL="${BASE_URL:-http://localhost:4321}"
export TEST_EMAIL="${TEST_EMAIL:-qa+clerk_test@example.com}"
export TEST_PASSWORD="${TEST_PASSWORD:-biblocalqa}"
export TEST_VERIFY_CODE="${TEST_VERIFY_CODE:-424242}"

# Which D1 database scenario seeds (scripts/qa-scenario.sh) should target:
# the local D1 when testing a local server, the remote QA D1 otherwise.
# Overridable by setting QA_TARGET explicitly.
case "$BASE_URL" in
  *localhost*|*127.0.0.1*) export QA_TARGET="${QA_TARGET:-local}" ;;
  *)                       export QA_TARGET="${QA_TARGET:-remote}" ;;
esac

# Check the server under test is responding
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" | grep -q "200\|302"; then
  echo "Warning: Server may not be responding at $BASE_URL"
  echo "For local runs, start it with: npm run dev"
  echo ""
fi

# Close any existing browser session
agent-browser close >/dev/null 2>&1 || true

echo "Config:"
echo "  BASE_URL: $BASE_URL"
echo "  QA_TARGET: $QA_TARGET"
echo "  TEST_EMAIL: $TEST_EMAIL"
echo ""

# Track results
PASSED=0
FAILED=0
SKIPPED=0
JOURNEYS=()

run_journey() {
  local name="$1"
  local script="$2"
  local rc

  echo ""
  # `if` keeps this exempt from `set -e` so a failing journey doesn't abort the run.
  # Exit codes: 0 = pass, 2 = skipped (e.g. journey not applicable in QA mode), else fail.
  # Use assignment (not `((PASSED++))`) for the counters: post-increment returns the
  # pre-increment value, so the first 0→1 bump exits non-zero and trips `set -e`.
  if bash "$script"; then rc=0; else rc=$?; fi

  if [ "$rc" -eq 0 ]; then
    PASSED=$((PASSED + 1))
    JOURNEYS+=("✓ $name")
  elif [ "$rc" -eq 2 ]; then
    SKIPPED=$((SKIPPED + 1))
    JOURNEYS+=("⊘ $name (skipped)")
  else
    FAILED=$((FAILED + 1))
    JOURNEYS+=("✗ $name")
  fi

  # Close browser between journeys for clean state
  agent-browser close >/dev/null 2>&1 || true
}

# Run journeys
run_journey "Authentication" "$SCRIPT_DIR/journeys/01-auth.sh"
run_journey "Biblio Operations" "$SCRIPT_DIR/journeys/02-shelf.sh"
run_journey "Profile" "$SCRIPT_DIR/journeys/03-profile.sh"
run_journey "Local" "$SCRIPT_DIR/journeys/04-matches.sh"
run_journey "Navigation" "$SCRIPT_DIR/journeys/05-navigation.sh"
run_journey "Onboarding" "$SCRIPT_DIR/journeys/06-onboarding.sh"
run_journey "Geolocation" "$SCRIPT_DIR/journeys/07-geolocation.sh"
run_journey "Connections" "$SCRIPT_DIR/journeys/08-connections.sh"
run_journey "Edge Cases" "$SCRIPT_DIR/journeys/09-edge-cases.sh"
run_journey "Bookstore" "$SCRIPT_DIR/journeys/10-bookstore.sh"
run_journey "Filters" "$SCRIPT_DIR/journeys/11-filters.sh"
run_journey "Scanner" "$SCRIPT_DIR/journeys/12-scanner.sh"
run_journey "Goodreads Import" "$SCRIPT_DIR/journeys/13-import.sh"
run_journey "Book Lifecycle" "$SCRIPT_DIR/journeys/14-book-lifecycle.sh"
run_journey "Stores Directory" "$SCRIPT_DIR/journeys/15-stores.sh"
run_journey "Profile Save" "$SCRIPT_DIR/journeys/16-profile-save.sh"
run_journey "Content Pages" "$SCRIPT_DIR/journeys/17-content-pages.sh"

# Summary
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║              Test Summary                     ║"
echo "╚═══════════════════════════════════════════════╝"
for j in "${JOURNEYS[@]}"; do
  echo "  $j"
done
echo ""
echo "Passed: $PASSED  Failed: $FAILED  Skipped: $SKIPPED"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
