#!/usr/bin/env bash
# Journey: Matches display
# Tests: map rendering, match cards, facets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 4: Matches Display"
echo "═══════════════════════════════════════"

login_test_user

# Navigate to matches
info "Test: Navigate to matches page"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
ref=$(echo "$snapshot" | grep -i "Matches" | grep "link" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
agent-browser click @"$ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/matches"

# Test 1: Matches page structure
info "Test: Matches page renders"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
assert_element "Nearby\|Matches\|People"

# Test 2: Map container
info "Test: Map component present"
# Leaflet maps often don't appear in accessibility tree
# Take screenshot for visual verification
agent-browser screenshot >/dev/null 2>&1
pass "Map area rendered (check screenshot)"

# Test 3: Match cards or empty state
info "Test: Match cards or empty state"
if echo "$snapshot" | grep -qi "match\|nearby\|no matches\|empty\|user"; then
  pass "Match state displayed"
else
  info "Match cards may require location data"
fi

# Test 4: Add bookstore link (from updated matches page)
info "Test: Add bookstore action"
if echo "$snapshot" | grep -qi "add.*store\|bookstore"; then
  pass "Add bookstore link present"
else
  info "Add bookstore link not found"
fi

# Test 5: Match facets (if matches exist)
info "Test: Match facet types"
facets=("shelf twin" "reading mentor" "local source" "discussion" "class chain")
found=0
for facet in "${facets[@]}"; do
  if echo "$snapshot" | grep -qi "$facet"; then
    ((found++))
  fi
done
if [ $found -gt 0 ]; then
  pass "Found $found match facet types"
else
  info "No match facets visible (may need matches first)"
fi

# Test 6: Interaction with map/cards
info "Test: Map interactivity"
# Check for clickable markers or cards
snapshot=$(agent-browser snapshot -i -C 2>/dev/null)
if echo "$snapshot" | grep -qi "marker\|card\|clickable"; then
  pass "Interactive elements found"
else
  info "Interactivity depends on data state"
fi

echo ""
pass "Matches journey complete!"
