#!/usr/bin/env bash
# QA Test Helpers for biblocal

# NOTE: deliberately NOT using `set -e`. Journeys source this file, so `set -e`
# would propagate into them and abort a whole journey on any incidental non-zero
# command (e.g. a `grep` with no match or a flaky agent-browser call) — even after
# its real assertions passed. This is an assertion-style suite: failures are raised
# explicitly via `fail()` (which exits 1). `set -u`/`pipefail` are kept.
set -uo pipefail

export BASE_URL="${BASE_URL:-http://localhost:4321}"
export TEST_EMAIL="${TEST_EMAIL:-qa+clerk_test@example.com}"
export TEST_PASSWORD="${TEST_PASSWORD:-biblocalqa}"
export TEST_VERIFY_CODE="${TEST_VERIFY_CODE:-424242}"
export QA_MODE="${QA_MODE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

# True when running against the auth-bypassed QA environment.
is_qa_mode() { [ "${QA_MODE:-false}" = "true" ]; }

# Skip the current journey (exit 2 = "skipped", distinct from pass/fail).
# Use for journeys whose subject doesn't exist in the current mode
# (e.g. Clerk auth flows when QA_MODE bypasses authentication).
skip_journey() { echo -e "${YELLOW}⊘${NC} SKIPPED: $1"; exit 2; }

wait_and_snapshot() {
  agent-browser wait --load networkidle 2>/dev/null
  agent-browser snapshot -i 2>/dev/null
}

get_url() {
  agent-browser get url 2>/dev/null
}

assert_url() {
  local expected="$1"
  local actual
  actual=$(get_url)
  if [[ "$actual" == *"$expected"* ]]; then
    pass "URL contains '$expected'"
  else
    fail "Expected URL to contain '$expected', got '$actual'"
  fi
}

assert_element() {
  local pattern="$1"
  local snapshot
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "$pattern"; then
    pass "Found element matching '$pattern'"
  else
    fail "Element '$pattern' not found"
  fi
}

login_test_user() {
  # In QA mode, skip login and go directly to shelf.
  # Retry the navigation: agent-browser occasionally reports about:blank on the
  # first open, which previously caused a spurious assert_url failure downstream.
  if [ "$QA_MODE" = "true" ]; then
    info "QA Mode: Skipping login, navigating to /biblio"
    local tries=0 url=""
    while [ $tries -lt 3 ]; do
      agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
      agent-browser wait --load networkidle >/dev/null 2>&1
      url=$(get_url)
      [[ "$url" == *"/biblio"* ]] && break
      tries=$((tries + 1))
      sleep 1
    done
    if [[ "$url" == *"/biblio"* ]]; then
      pass "QA Mode active"
    else
      fail "QA Mode: could not navigate to /biblio (last url: '$url')"
    fi
    return 0
  fi

  info "Logging in as $TEST_EMAIL"
  agent-browser open "$BASE_URL" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1

  local snapshot
  snapshot=$(agent-browser snapshot -i 2>/dev/null)

  # Check if already logged in
  if echo "$snapshot" | grep -q "Open user menu"; then
    pass "Already logged in"
    return 0
  fi

  # Find email input (dynamically)
  local email_ref
  email_ref=$(echo "$snapshot" | grep -i "email address" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//')

  # Find password input (dynamically)
  local pass_ref
  pass_ref=$(echo "$snapshot" | grep -i "password" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)

  # Find continue/submit button
  local submit_ref
  submit_ref=$(echo "$snapshot" | grep -i "continue" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//')

  if [ -z "$email_ref" ] || [ -z "$pass_ref" ] || [ -z "$submit_ref" ]; then
    fail "Could not find login form elements. Email: $email_ref, Password: $pass_ref, Submit: $submit_ref"
  fi

  # Fill login form
  agent-browser fill @"$email_ref" "$TEST_EMAIL" >/dev/null 2>&1
  agent-browser fill @"$pass_ref" "$TEST_PASSWORD" >/dev/null 2>&1
  agent-browser click @"$submit_ref" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1

  # Handle 2FA if needed
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "verification code"; then
    info "Entering 2FA code"
    local verify_ref
    verify_ref=$(echo "$snapshot" | grep -i "verification\|code" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
    local verify_submit
    verify_submit=$(echo "$snapshot" | grep -i "continue\|verify" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | tail -1)

    if [ -n "$verify_ref" ]; then
      agent-browser fill @"$verify_ref" "$TEST_VERIFY_CODE" >/dev/null 2>&1
    fi
    if [ -n "$verify_submit" ]; then
      agent-browser click @"$verify_submit" >/dev/null 2>&1
    fi
    agent-browser wait --load networkidle >/dev/null 2>&1
  fi

  pass "Login complete"
}

logout_user() {
  info "Logging out"
  local snapshot
  snapshot=$(agent-browser snapshot -i 2>/dev/null)

  if echo "$snapshot" | grep -q "Open user menu"; then
    # Click user menu
    local ref
    ref=$(echo "$snapshot" | grep "Open user menu" | grep -o '@e[0-9]*' | head -1)
    agent-browser click "$ref" >/dev/null 2>&1
    sleep 1

    # Look for sign out button
    snapshot=$(agent-browser snapshot -i 2>/dev/null)
    if echo "$snapshot" | grep -qi "sign out"; then
      ref=$(echo "$snapshot" | grep -i "sign out" | grep -o '@e[0-9]*' | head -1)
      agent-browser click "$ref" >/dev/null 2>&1
      agent-browser wait --load networkidle >/dev/null 2>&1
      pass "Logged out"
    fi
  fi
}

cleanup() {
  agent-browser close >/dev/null 2>&1 || true
}

trap cleanup EXIT
