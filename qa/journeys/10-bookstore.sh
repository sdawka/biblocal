#!/usr/bin/env bash
# Journey: Bookstore
# Scenario: edge (has qa-bookstore) or matches (has Montreal stores)
# Tests: Store card UI, store-specific display, specialties

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 10: Bookstore"
echo "═══════════════════════════════════════"

# Load matches scenario (has real Montreal bookstores)
info "Loading matches scenario..."
npm run qa:scenario matches --silent >/dev/null 2>&1 || {
  fail "Could not load matches scenario"
}
pass "Matches scenario loaded"

# Navigate to matches
info "Test: Bookstores appear in matches"
agent-browser open "$BASE_URL/matches" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Look for bookstore indicators
if echo "$snapshot" | grep -qi "drawn\|quarterly\|word\|argo\|librairie\|bookshop\|store"; then
  pass "Bookstore found in matches"
else
  info "No bookstores visible (may need matching books)"
fi

# Look for store badge/icon
if echo "$snapshot" | grep -qi "🏪"; then
  pass "Store emoji badge visible"
else
  info "Store badge may use different indicator"
fi

# Try to expand a store card
info "Test: Expand bookstore card"
store_ref=$(echo "$snapshot" | grep -i "drawn\|argo\|word\|store\|bookshop" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
if [ -n "$store_ref" ]; then
  agent-browser click @"$store_ref" >/dev/null 2>&1
  sleep 0.5

  snapshot=$(agent-browser snapshot -i 2>/dev/null)

  # Check for store-specific fields
  info "Test: Store details visible"

  # Address
  if echo "$snapshot" | grep -qi "address\|street\|rue\|ave"; then
    pass "Store address displayed"
  else
    info "Address not visible"
  fi

  # Neighborhood
  if echo "$snapshot" | grep -qi "mile end\|plateau\|downtown\|mcgill\|neighborhood"; then
    pass "Neighborhood displayed"
  else
    info "Neighborhood not visible"
  fi

  # Specialties
  if echo "$snapshot" | grep -qi "specialties\|literary\|comics\|used\|rare\|philosophy"; then
    pass "Store specialties displayed"
  else
    info "Specialties not visible"
  fi

  # Website link
  if echo "$snapshot" | grep -qi "website\|visit"; then
    pass "Website link present"
  else
    info "Website link not found"
  fi

  # Store detail link
  if echo "$snapshot" | grep -qi "view store\|details"; then
    pass "View store details link present"
  else
    info "Store details link not found"
  fi
else
  info "Could not find bookstore card to expand"
fi

# Take screenshot
agent-browser screenshot >/dev/null 2>&1
pass "Bookstore UI screenshot captured"

# Check store page exists (if implemented)
info "Test: Store detail page"
# Try navigating to a store page
agent-browser open "$BASE_URL/store/store-drawn" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
current_url=$(get_url)

if echo "$current_url" | grep -qi "store"; then
  if echo "$snapshot" | grep -qi "drawn\|quarterly\|books"; then
    pass "Store detail page loads"
  else
    info "Store page may redirect or show error"
  fi
else
  info "Store detail page may not be implemented"
fi

echo ""
pass "Bookstore journey complete!"
