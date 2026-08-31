#!/usr/bin/env bash
# Journey: Filters
# Scenario: power (50 books with varied intents)
# Tests: open the Filter popover, filter by intent/ownership/visibility, reset

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 11: Filters"
echo "═══════════════════════════════════════"

# Filter chips live inside FilterPopover (opened from the "Filters" button in
# the biblio toolbar — see ShelfIsland.svelte / FilterPopover.svelte), not on
# the page itself. Every filter interaction must open the popover first;
# grepping the bare page for "Lending" etc. finds card intent pills instead.

# Open the Filter popover (idempotent: no-op if already open).
open_filter_popover() {
  local snapshot ref
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  # aria-expanded shows in the snapshot when the popover is already open
  if echo "$snapshot" | grep -i "filter" | grep -qi "expanded"; then
    return 0
  fi
  ref=$(echo "$snapshot" | grep -i "filter" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
  [ -n "$ref" ] || fail "Filter button not found in biblio toolbar"
  agent-browser click @"$ref" >/dev/null 2>&1
  sleep 0.5
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if ! echo "$snapshot" | grep -qi "private only"; then
    fail "Filter popover did not open (no filter chips in snapshot)"
  fi
}

# Toggle the chip labelled $1 inside the open popover. Chips carry a count
# suffix (e.g. "Lending 20"), which distinguishes them from same-named intent
# pills on book cards; the popover also precedes the cards in the snapshot,
# so the first match falls back to the chip if no counted label is found.
toggle_chip() {
  local label="$1"
  local snapshot ref
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  ref=$(echo "$snapshot" | grep -iE "\"$label [0-9]+\"" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
  if [ -z "$ref" ]; then
    ref=$(echo "$snapshot" | grep -i "button" | grep -i "$label" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
  fi
  [ -n "$ref" ] || fail "Filter chip '$label' not found in popover"
  agent-browser click @"$ref" >/dev/null 2>&1
  sleep 0.5
}

# Assert a title pattern is NOT in the current snapshot (filtered out).
assert_absent() {
  local pattern="$1"
  local snapshot
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "$pattern"; then
    fail "Expected '$pattern' to be filtered out, but it is still visible"
  else
    pass "'$pattern' filtered out"
  fi
}

# Load power scenario (50 books)
info "Loading power scenario..."
npm run qa:scenario power --silent >/dev/null 2>&1 || {
  fail "Could not load power scenario"
}
pass "Power scenario loaded"

# Navigate to biblio
info "Test: Biblio loads with many books"
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "dune\|foundation\|neuromancer"; then
  pass "Multiple books visible on biblio"
else
  fail "Power scenario books (Dune/Foundation/Neuromancer) not visible on biblio"
fi

# Open the filter popover
info "Test: Filter popover opens"
open_filter_popover
pass "Filter popover open with filter chips"

# Test borrowable (Lending) filter
info "Test: Filter by Lending"
toggle_chip "Lending"
assert_element "dune"
assert_absent "godel"
toggle_chip "Lending"  # clear before next test

# Test discussable (Discussion) filter
info "Test: Filter by Discussion"
toggle_chip "Discussion"
assert_element "godel"
assert_absent "neuromancer"
toggle_chip "Discussion"

# Test giftable (Gifting) filter
info "Test: Filter by Gifting"
toggle_chip "Gifting"
assert_element "alchemist"
assert_absent "neuromancer"
toggle_chip "Gifting"

# Test seeking (ownership) filter
info "Test: Filter by am seeking"
toggle_chip "am seeking"
assert_element "small gods"
assert_absent "dune"
toggle_chip "am seeking"

# Test private-only (visibility) filter
info "Test: Filter by Private only"
toggle_chip "Private only"
assert_element "diary"
assert_absent "dune"
toggle_chip "Private only"

# Reset: with all chips toggled back off, the full shelf should be visible
info "Test: All books visible after clearing filters"
agent-browser press Escape >/dev/null 2>&1
sleep 0.5
assert_element "dune"
assert_element "godel"
assert_element "small gods"

# Verify biblio stats
info "Test: Biblio statistics"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qiE "showing [0-9]+ of [0-9]+ books|[0-9]+ books"; then
  pass "Biblio statistics visible"
else
  fail "Biblio book-count statistics not found"
fi

echo ""
pass "Filters journey complete!"
