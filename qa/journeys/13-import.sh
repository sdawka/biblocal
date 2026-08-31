#!/usr/bin/env bash
# Journey: Goodreads CSV Import
# Scenario: minimal (QA user with 2 books, so imported titles are unambiguous)
# Tests: open ImportIsland from the biblio intake row, upload a fixture CSV,
#        preview shows parsed rows, confirm import, imported books persist
#        on the shelf after a reload.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

FIXTURE="$SCRIPT_DIR/../fixtures/goodreads-sample.csv"

echo "═══════════════════════════════════════"
echo "Journey 13: Goodreads Import"
echo "═══════════════════════════════════════"

[ -f "$FIXTURE" ] || fail "Fixture CSV not found at $FIXTURE"

# Load minimal scenario (Dune + Neuromancer only; fixture titles must be absent)
info "Loading minimal scenario..."
npm run qa:scenario minimal --silent >/dev/null 2>&1 || {
  fail "Could not load minimal scenario"
}
pass "Minimal scenario loaded"

login_test_user
assert_url "/biblio"

# Sanity: fixture titles are not already on the shelf (import assertions
# below would be vacuous otherwise).
info "Test: Fixture titles absent before import"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "left hand of darkness\|piranesi\|dispossessed"; then
  fail "Fixture titles already on shelf — minimal scenario did not reset"
fi
pass "Shelf clean of fixture titles"

# Open the import panel ("Import from Goodreads" trigger in the intake row)
info "Test: Open Goodreads import flow"
import_ref=$(echo "$snapshot" | grep -i "import from goodreads" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$import_ref" ] || fail "'Import from Goodreads' trigger not found on /biblio"
agent-browser click @"$import_ref" >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "choose csv file"; then
  pass "Import upload step visible"
else
  fail "Import panel did not open (no 'Choose CSV File' control)"
fi

# Upload the fixture CSV into the hidden file input inside ImportIsland
info "Test: Upload fixture CSV"
if ! agent-browser upload 'input[type="file"]' "$FIXTURE" >/dev/null 2>&1; then
  fail "agent-browser upload to input[type=file] failed"
fi
sleep 1

# Preview: all 3 fixture rows parsed
info "Test: Preview shows parsed rows"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "3 books found"; then
  pass "Preview reports 3 books found"
else
  fail "Preview did not report '3 books found'"
fi
echo "$snapshot" | grep -qi "left hand of darkness" || fail "Preview missing 'The Left Hand of Darkness'"
echo "$snapshot" | grep -qi "piranesi" || fail "Preview missing 'Piranesi'"
echo "$snapshot" | grep -qi "dispossessed" || fail "Preview missing 'The Dispossessed'"
pass "All 3 fixture titles in preview"

# The to-read row should be mapped to seeking
if echo "$snapshot" | grep -qi "seeking"; then
  pass "to-read row mapped to Seeking"
else
  fail "No 'Seeking' pill in preview (to-read shelf mapping broken)"
fi

# Confirm the import (all rows pre-selected)
info "Test: Confirm import"
confirm_ref=$(echo "$snapshot" | grep -i "import 3 books" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$confirm_ref" ] || fail "'Import 3 books' button not found in preview"
agent-browser click @"$confirm_ref" >/dev/null 2>&1

# Import fetches covers from Open Library; poll for the done step
tries=0
while [ $tries -lt 15 ]; do
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  echo "$snapshot" | grep -qi "import complete" && break
  tries=$((tries + 1))
  sleep 2
done
if echo "$snapshot" | grep -qi "import complete"; then
  pass "Import completed"
else
  fail "Import did not reach 'Import complete' within 30s"
fi
echo "$snapshot" | grep -qi "imported" || fail "Done step missing imported count"

# Reload the shelf and assert the imported books persisted server-side
info "Test: Imported books persist on shelf after reload"
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "left hand of darkness" || fail "'The Left Hand of Darkness' not on shelf after reload"
echo "$snapshot" | grep -qi "piranesi" || fail "'Piranesi' not on shelf after reload"
echo "$snapshot" | grep -qi "dispossessed" || fail "'The Dispossessed' not on shelf after reload"
pass "Imported books persisted to shelf"

echo ""
pass "Goodreads import journey complete!"
