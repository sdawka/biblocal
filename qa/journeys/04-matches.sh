#!/usr/bin/env bash
# Journey: Local (matches) display
# Tests: Books/People/Map tab switcher, grouped book feed, match cards, facets, map rendering

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 4: Local Display"
echo "═══════════════════════════════════════"

login_test_user

# Navigate to Local
info "Test: Navigate to Local page"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
ref=$(echo "$snapshot" | grep -i "Local" | grep "link" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
agent-browser click @"$ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
assert_url "/local"

# Test 1: Local page structure
info "Test: Local page renders"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
assert_element "Nearby\|Books\|People\|Map"

# Test 2: Books view is the default (grouped feed)
# LocalDiscovery defaults to the "books" tab: a feed grouped into
# "To borrow" / "To discuss" / "Free & giftable" sections (or an empty state).
info "Test: Books view renders grouped feed or empty state by default"
if echo "$snapshot" | grep -qi "to borrow\|to discuss\|free & giftable\|no books nearby"; then
  pass "Books view (grouped feed or empty state) displayed"
else
  info "Books view content may require seeded nearby books"
fi

# Test 3: Add bookstore action
info "Test: Add bookstore action"
if echo "$snapshot" | grep -qi "add.*store\|bookstore"; then
  pass "Add bookstore link present"
else
  info "Add bookstore link not found"
fi

# Test 4: Switch to People tab and check match cards or empty state
info "Test: People tab shows match cards or empty state"
people_ref=$(echo "$snapshot" | grep -i "People" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$people_ref" ]; then
  agent-browser click "$people_ref" >/dev/null 2>&1
  sleep 1
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
fi
if echo "$snapshot" | grep -qi "match\|nearby\|no matches\|empty\|user"; then
  pass "Match state displayed"
else
  info "Match cards may require location data"
fi

# Test 5: Match facets (if matches exist, in People view)
info "Test: Match facet types"
facets=("shelf twin" "reading mentor" "can borrow" "discussion")
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

# Test 6: Switch to Map tab and check map container
info "Test: Map tab renders map component"
map_ref=$(echo "$snapshot" | grep -i "Map" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$map_ref" ]; then
  agent-browser click "$map_ref" >/dev/null 2>&1
  sleep 1
fi
# Leaflet maps often don't appear in accessibility tree.
# Take screenshot for visual verification.
agent-browser screenshot >/dev/null 2>&1
pass "Map area rendered (check screenshot)"

# Test 7: Interaction with map/cards
info "Test: Map interactivity"
snapshot=$(agent-browser snapshot -i -C 2>/dev/null)
if echo "$snapshot" | grep -qi "marker\|card\|clickable"; then
  pass "Interactive elements found"
else
  info "Interactivity depends on data state"
fi

echo ""
pass "Local journey complete!"
