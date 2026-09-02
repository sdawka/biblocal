#!/usr/bin/env bash
# Journey: Stores Directory
# Scenario: matches (seeds 5 bookstores: Drawn & Quarterly, The Word,
#           Argo Bookshop, Librairie Le Port de Tête, Shakespeare and Company)
# Tests: /stores directory renders seeded store cards, store detail page,
#        add-store flow validation failure + successful submit.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 15: Stores Directory"
echo "═══════════════════════════════════════"

# Load matches scenario (has the seeded bookstores)
info "Loading matches scenario..."
npm run qa:scenario matches --silent >/dev/null 2>&1 || {
  fail "Could not load matches scenario"
}
pass "Matches scenario loaded"

# ── Directory page ───────────────────────────────────────────────────────

info "Test: /stores renders seeded store cards"
agent-browser open "$BASE_URL/stores" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

assert_path "/stores"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "bookstores" || fail "'Bookstores' heading not found on /stores"
echo "$snapshot" | grep -qi "drawn" || fail "Seeded store 'Drawn & Quarterly' not on /stores"
echo "$snapshot" | grep -qi "argo" || fail "Seeded store 'Argo Bookshop' not on /stores"
pass "Seeded store cards render on /stores"

# ── Store detail page ────────────────────────────────────────────────────

info "Test: Store card opens detail page"
store_ref=$(echo "$snapshot" | grep -i "argo" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$store_ref" ] || fail "Argo Bookshop card has no clickable ref"
agent-browser click @"$store_ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

assert_url "/store/"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "argo" || fail "Store detail page does not show 'Argo Bookshop'"
pass "Store detail page renders"

# ── Add-store flow: validation failure ───────────────────────────────────

info "Test: /stores/new empty submit shows validation error"
agent-browser open "$BASE_URL/stores/new" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "add a bookstore" || fail "'Add a Bookstore' form not found on /stores/new"

submit_ref=$(echo "$snapshot" | grep '"Add Store"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$submit_ref" ] || fail "'Add Store' submit button not found"
agent-browser click @"$submit_ref" >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "name, neighborhood, and address are required"; then
  pass "Validation error shown for empty submit"
else
  fail "Empty submit did not show the required-fields validation error"
fi

# ── Add-store flow: successful submit ────────────────────────────────────

STORE_NAME="QA Test Books"

info "Test: Submit AddStoreIsland with valid data"
name_ref=$(echo "$snapshot" | grep -i "store name" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$name_ref" ] || fail "Store name input not found"
agent-browser fill @"$name_ref" "$STORE_NAME" >/dev/null 2>&1

neighborhood_ref=$(echo "$snapshot" | grep -i "neighborhood" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$neighborhood_ref" ] || fail "Neighborhood select not found"
agent-browser select @"$neighborhood_ref" "Mile End" >/dev/null 2>&1

address_ref=$(echo "$snapshot" | grep -i "address" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$address_ref" ] || fail "Address input not found"
agent-browser fill @"$address_ref" "123 QA Street, Montreal" >/dev/null 2>&1

agent-browser click @"$submit_ref" >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "store added"; then
  pass "Store submitted successfully"
else
  fail "Success message not shown after valid store submit"
fi

info "Test: New store appears in /stores directory"
agent-browser open "$BASE_URL/stores" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "$STORE_NAME"; then
  pass "New store '$STORE_NAME' listed on /stores"
else
  fail "New store '$STORE_NAME' not found on /stores after creation"
fi

echo ""
pass "Stores journey complete!"
