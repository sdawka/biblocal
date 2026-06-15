#!/usr/bin/env bash
# Journey: Authentication flows
# Tests: login, protected routes, logout, redirect behavior

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 1: Authentication"
echo "═══════════════════════════════════════"

# This journey exercises Clerk auth: the login form, unauthenticated-route
# redirects, and logout. QA_MODE bypasses Clerk entirely (every request is the
# seeded QA user), so none of these flows exist there — skip rather than fail.
if is_qa_mode; then
  skip_journey "Authentication flows are bypassed when QA_MODE=true (no Clerk login form or auth redirects)"
fi

# Test 1: Unauthenticated user sees login page
info "Test: Home page shows login form"
agent-browser open "$BASE_URL" >/dev/null 2>&1
wait_and_snapshot >/dev/null
assert_element "Email address"
assert_element "Continue"

# Test 2: Protected routes redirect to home
info "Test: /shelf redirects unauthenticated users"
agent-browser open "$BASE_URL/shelf" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/"
assert_element "Sign in"

info "Test: /profile redirects unauthenticated users"
agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/"

info "Test: /matches redirects unauthenticated users"
agent-browser open "$BASE_URL/matches" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/"

# Test 3: Login flow
info "Test: Login redirects to /shelf"
login_test_user
assert_url "/shelf"

# Test 4: Authenticated user on home redirects to shelf
info "Test: Authenticated user visiting / redirects to /shelf"
agent-browser open "$BASE_URL" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/shelf"

# Test 5: Navigation between protected pages
info "Test: Can navigate between protected pages"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
ref=$(echo "$snapshot" | grep -i "Profile" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
agent-browser click @"$ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/profile"

snapshot=$(agent-browser snapshot -i 2>/dev/null)
ref=$(echo "$snapshot" | grep -i "Matches" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
agent-browser click @"$ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/matches"

# Test 6: Logout
info "Test: Logout returns to home"
logout_user
assert_url "/"
assert_element "Sign in"

echo ""
pass "All authentication tests passed!"
