#!/usr/bin/env bash
# Journey: Profile Save
# Scenario: minimal (QA Tester in Montreal)
# Tests: edit profile name + city in ProfileIsland edit mode, then reload and
#        assert both persisted (PATCH /api/profile round-trip).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

NEW_NAME="QA Renamed Tester"
NEW_CITY="Toronto"

echo "═══════════════════════════════════════"
echo "Journey 16: Profile Save"
echo "═══════════════════════════════════════"

# Load minimal scenario (resets profile to QA Tester / Montreal)
info "Loading minimal scenario..."
npm run qa:scenario minimal --silent >/dev/null 2>&1 || {
  fail "Could not load minimal scenario"
}
pass "Minimal scenario loaded"

login_test_user

info "Test: Open profile page"
agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

assert_path "/profile"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "qa tester" || fail "Seeded profile name 'QA Tester' not shown on /profile"
pass "Seeded profile visible"

# Enter edit mode (view-mode header has an "Edit" button)
info "Test: Enter edit mode"
edit_ref=$(echo "$snapshot" | grep '"Edit"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$edit_ref" ] || fail "'Edit' button not found on profile view"
agent-browser click @"$edit_ref" >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "edit profile" || fail "Edit mode did not open ('Edit Profile' heading missing)"
pass "Edit mode open"

# Change name (saved on blur)
info "Test: Change name"
name_ref=$(echo "$snapshot" | grep -i '"Name"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$name_ref" ] || fail "Name input not found in edit mode"
agent-browser fill @"$name_ref" "$NEW_NAME" >/dev/null 2>&1
agent-browser press Tab >/dev/null 2>&1
sleep 1

# Change city (saved on change)
info "Test: Change city"
city_ref=$(echo "$snapshot" | grep -i '"City"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$city_ref" ] || fail "City select not found in edit mode"
agent-browser select @"$city_ref" "$NEW_CITY" >/dev/null 2>&1
sleep 2

# Reload and assert persistence (server round-trip, not just local state)
info "Test: Name and city persist across reload"
agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "$NEW_NAME" || fail "Renamed profile '$NEW_NAME' did not persist after reload"
pass "Name persisted"
echo "$snapshot" | grep -qi "$NEW_CITY" || fail "City '$NEW_CITY' did not persist after reload"
pass "City persisted"

if echo "$snapshot" | grep -qi "qa tester"; then
  fail "Old name 'QA Tester' still shown after rename"
fi
pass "Old name gone"

echo ""
pass "Profile save journey complete!"
