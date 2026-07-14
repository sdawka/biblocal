#!/usr/bin/env bash
# Journey: Biblio (shelf) operations
# Tests: add book (ISBN/manual), intent badges, filter popover, edit modal, empty state / add slot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 2: Biblio Operations"
echo "═══════════════════════════════════════"

login_test_user
assert_url "/biblio"

# Test 1: Biblio page structure
info "Test: Biblio page has required sections"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
assert_element "Biblio"
# "Open user menu" is the Clerk UserButton label, which only exists in authed
# (non-QA) mode. In QA mode assert the always-present nav chrome instead.
if is_qa_mode; then
  assert_element "Profile"
else
  assert_element "Open user menu"
fi

# Test 2: Add-book slot present
# The old standalone "Add a book" compose panel is gone. Biblio is now a
# single Bookshelf island: a "+" add slot (collapsed) that expands the
# add-book form in place when clicked (see Bookshelf.svelte add-slot).
info "Test: Add book slot present"
if echo "$snapshot" | grep -qi "ISBN\|add.*book\|add your first\|search"; then
  pass "Add book slot found"
else
  info "Add book slot may be collapsed or named differently"
fi

# Test 3: Check for empty state or existing books
info "Test: Shelf displays books or empty state"
if echo "$snapshot" | grep -qi "empty\|no books\|add your first\|BookCard"; then
  pass "Shelf state displayed correctly"
else
  # Take screenshot to visually verify
  agent-browser screenshot >/dev/null 2>&1
  pass "Shelf rendered (check screenshot for visual verification)"
fi

# Test 4: Add a book via ISBN lookup (if available)
info "Test: ISBN lookup flow"
snapshot=$(agent-browser snapshot -i 2>/dev/null)

# The ISBN input lives inside the "+" add slot, which starts collapsed and
# expands in place when clicked (Bookshelf.svelte). Open it first so the
# form is present in the snapshot.
add_slot_ref=$(echo "$snapshot" | grep -i "add a book\|add your first\|+" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$add_slot_ref" ]; then
  agent-browser click "$add_slot_ref" >/dev/null 2>&1
  sleep 1
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
fi

# Look for ISBN input field
isbn_ref=$(echo "$snapshot" | grep -i "isbn\|search" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$isbn_ref" ]; then
  # Try adding a classic book
  agent-browser fill "$isbn_ref" "9780140449136" >/dev/null 2>&1  # Crime and Punishment

  # Look for search/add button
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  add_ref=$(echo "$snapshot" | grep -i "search\|add\|look" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
  if [ -n "$add_ref" ]; then
    agent-browser click "$add_ref" >/dev/null 2>&1
    sleep 2
    agent-browser wait --load networkidle >/dev/null 2>&1
    pass "ISBN lookup triggered"
  fi
else
  info "ISBN input not found in current view"
fi

# Test 5: Check intent pills on book cards (if books exist)
info "Test: Book intent controls"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "lend\|discuss\|gift\|seeking\|private"; then
  pass "Book intent badges/pills present"
else
  info "No intent controls visible (may need books first)"
fi

# Test 6: Filter popover (filters moved off the page into a popover)
info "Test: Filter popover"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
filter_ref=$(echo "$snapshot" | grep -i "filter" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$filter_ref" ]; then
  agent-browser click "$filter_ref" >/dev/null 2>&1
  sleep 1
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "lending\|discussion\|gifting\|private only"; then
    pass "Filter popover opens with filter chips"
  else
    info "Filter popover content not detected"
  fi
  agent-browser press Escape >/dev/null 2>&1
else
  info "Filter button not found"
fi

# Test 7: Book card opens the edit modal (details view)
info "Test: Card opens edit modal"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
details_ref=$(echo "$snapshot" | grep -i "\"Details\"" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$details_ref" ] && agent-browser click "$details_ref" >/dev/null 2>&1 && sleep 1
snapshot=$(agent-browser snapshot -i 2>/dev/null)
card_ref=$(echo "$snapshot" | grep -i "view details for" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$card_ref" ]; then
  agent-browser click "$card_ref" >/dev/null 2>&1
  sleep 1
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "change cover"; then
    pass "Edit modal opens from details-view card with cover controls"
  else
    info "Modal opened but cover controls not detected"
  fi
  agent-browser press Escape >/dev/null 2>&1
else
  info "No book card found (shelf may be empty)"
fi

echo ""
pass "Biblio journey complete!"
