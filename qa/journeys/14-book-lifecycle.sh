#!/usr/bin/env bash
# Journey: Book Lifecycle
# Scenario: minimal (Dune [Lending], Neuromancer [Discussion])
# Tests: edit intent + visibility via BookDetailSheet and assert persistence
#        across a reload, add a note and assert it renders, delete a book
#        and assert it is gone after a reload.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 14: Book Lifecycle"
echo "═══════════════════════════════════════"

# Load minimal scenario for a known starting state
info "Loading minimal scenario..."
npm run qa:scenario minimal --silent >/dev/null 2>&1 || {
  fail "Could not load minimal scenario"
}
pass "Minimal scenario loaded"

login_test_user
assert_url "/biblio"
sleep 1

# Open the detail sheet for a book whose card matches $1 (case-insensitive).
open_book_sheet() {
  local title="$1"
  local snapshot ref
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  ref=$(echo "$snapshot" | grep -i "view details for $title" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
  [ -n "$ref" ] || fail "Book card for '$title' not found on shelf"
  agent-browser click @"$ref" >/dev/null 2>&1
  sleep 1
}

# ── Edit: toggle intent + visibility on Dune ────────────────────────────

info "Test: Dune starts without Gifting intent or Private visibility"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
dune_line=$(echo "$snapshot" | grep -i "view details for dune")
[ -n "$dune_line" ] || fail "Dune card not found on shelf"
if echo "$dune_line" | grep -qi "gifting"; then
  fail "Dune already has Gifting intent — minimal scenario did not reset"
fi
pass "Dune starting state clean"

info "Test: Toggle Gifting intent in detail sheet"
open_book_sheet "dune"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
gift_ref=$(echo "$snapshot" | grep '"Gifting"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$gift_ref" ] || fail "Gifting intent pill not found in detail sheet"
agent-browser click @"$gift_ref" >/dev/null 2>&1
sleep 1

info "Test: Switch visibility to Private in detail sheet"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
private_ref=$(echo "$snapshot" | grep '"Private"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$private_ref" ] || fail "Private visibility toggle not found in detail sheet"
agent-browser click @"$private_ref" >/dev/null 2>&1
sleep 1
agent-browser press Escape >/dev/null 2>&1
sleep 1

info "Test: Intent + visibility persist across reload"
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
snapshot=$(agent-browser snapshot -i 2>/dev/null)
dune_line=$(echo "$snapshot" | grep -i "view details for dune")
[ -n "$dune_line" ] || fail "Dune card missing after reload"
echo "$dune_line" | grep -qi "gifting" || fail "Gifting intent did not persist on Dune after reload"
pass "Gifting intent persisted"
echo "$dune_line" | grep -qi "private" || fail "Private visibility did not persist on Dune after reload"
pass "Private visibility persisted"

# ── Notes: add a note and assert it renders ─────────────────────────────

NOTE_TEXT="QA lifecycle note about sandworms"

info "Test: Add a note to Dune"
open_book_sheet "dune"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
add_note_ref=$(echo "$snapshot" | grep -i '"Add a note"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$add_note_ref" ] || fail "'Add a note' control not found in detail sheet"
agent-browser click @"$add_note_ref" >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
note_input_ref=$(echo "$snapshot" | grep -i "what did you like" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$note_input_ref" ] || fail "Note textarea not found in note composer"
agent-browser fill @"$note_input_ref" "$NOTE_TEXT" >/dev/null 2>&1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
submit_note_ref=$(echo "$snapshot" | grep '"Add note"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$submit_note_ref" ] || fail "'Add note' submit button not found"
agent-browser click @"$submit_note_ref" >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "sandworms"; then
  pass "Note renders in detail sheet"
else
  fail "Added note text not visible in detail sheet"
fi
agent-browser press Escape >/dev/null 2>&1
sleep 1

# ── Delete: remove Neuromancer and assert it is gone ────────────────────

info "Test: Delete Neuromancer"
open_book_sheet "neuromancer"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
delete_ref=$(echo "$snapshot" | grep -i "delete neuromancer" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$delete_ref" ] || fail "Delete control for Neuromancer not found in detail sheet"
agent-browser click @"$delete_ref" >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "remove from shelf" || fail "Delete confirmation prompt not shown"
confirm_ref=$(echo "$snapshot" | grep '"Remove"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$confirm_ref" ] || fail "'Remove' confirm button not found"
agent-browser click @"$confirm_ref" >/dev/null 2>&1
sleep 1

info "Test: Neuromancer gone after reload"
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "view details for neuromancer"; then
  fail "Neuromancer still on shelf after delete + reload"
fi
pass "Neuromancer deleted and stayed deleted"

echo ""
pass "Book lifecycle journey complete!"
