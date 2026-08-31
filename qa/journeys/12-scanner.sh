#!/usr/bin/env bash
# Journey: Barcode scanner
# Tests: scan toggle opens the lazy-loaded scanner sheet, photo-upload and
# cancel controls render, cancel restores the ISBN input, and the typed-ISBN
# path still works — including an ISBN-10 with an X check digit, which the
# validator must accept.
#
# The camera itself cannot work headless: Quagga.init fails, so the sheet is
# expected to render its no-camera fallback with the photo-upload button.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 12: Barcode Scanner"
echo "═══════════════════════════════════════"

# First [ref=eN] whose snapshot line matches a pattern (case-insensitive).
find_ref() {
  echo "$1" | grep -i "$2" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1
}

# The ISBN input lives inside the "+" add slot (Bookshelf.svelte), which
# starts collapsed. Expand it if the input isn't already in the snapshot.
open_add_form() {
  local snapshot add_ref
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if ! echo "$snapshot" | grep -qi "Enter ISBN"; then
    add_ref=$(find_ref "$snapshot" "add a book\|add your first")
    [ -n "$add_ref" ] || fail "Add-book slot not found on /biblio"
    agent-browser click "$add_ref" >/dev/null 2>&1
    sleep 1
    snapshot=$(agent-browser snapshot -i 2>/dev/null)
  fi
  echo "$snapshot" | grep -qi "Enter ISBN" || fail "ISBN input did not appear after opening the add slot"
}

login_test_user
assert_url "/biblio"

# Test 1: Scan toggle present in the add-book form
info "Test: Scan toggle present"
open_add_form
snapshot=$(agent-browser snapshot -i 2>/dev/null)
scan_ref=$(find_ref "$snapshot" "scan isbn barcode\|scan barcode")
[ -n "$scan_ref" ] || fail "Scan toggle button not found in add-book form"
pass "Scan toggle button present"

# Test 2: Clicking the toggle lazy-loads and renders the scanner sheet
info "Test: Scanner sheet renders (lazy-load)"
agent-browser click "$scan_ref" >/dev/null 2>&1
sleep 2  # dynamic import of ScannerIsland + sheet animation
snapshot=$(agent-browser snapshot -i 2>/dev/null)
if echo "$snapshot" | grep -qi "Scan ISBN Barcode\|Camera not available\|Aim at the ISBN barcode"; then
  pass "Scanner sheet rendered"
else
  fail "Scanner sheet did not render after clicking the scan toggle"
fi

# Test 3: Photo-upload and cancel controls present
info "Test: Photo-upload and cancel controls"
echo "$snapshot" | grep -qi "Upload Photo\|Upload a photo" || fail "Photo-upload button not found in scanner sheet"
pass "Photo-upload button present"
cancel_ref=$(find_ref "$snapshot" "close scanner")
[ -n "$cancel_ref" ] || fail "Cancel (close scanner) button not found in scanner sheet"
pass "Cancel button present"

# Test 4: Cancel closes the sheet and returns to the ISBN input
info "Test: Cancel returns to ISBN input"
agent-browser click "$cancel_ref" >/dev/null 2>&1
sleep 1
snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "Upload Photo\|Upload a photo" && fail "Scanner sheet still open after cancel"
echo "$snapshot" | grep -qi "Enter ISBN" || fail "ISBN input not visible after closing the scanner"
pass "Cancel closed the scanner and restored the ISBN input"

# Test 5: ISBN-10 ending in X passes validation
info "Test: ISBN-10 with X check digit accepted"
isbn_ref=$(find_ref "$snapshot" "Enter ISBN")
[ -n "$isbn_ref" ] || fail "ISBN input ref not found"
agent-browser fill "$isbn_ref" "080442957X" >/dev/null 2>&1  # Waiting for Godot (ISBN-10, check digit X)
snapshot=$(agent-browser snapshot -i 2>/dev/null)
lookup_ref=$(find_ref "$snapshot" "look up book\|looking up")
[ -n "$lookup_ref" ] || fail "Look Up Book button not found"
agent-browser click "$lookup_ref" >/dev/null 2>&1
sleep 2
agent-browser wait --load networkidle >/dev/null 2>&1
snapshot=$(agent-browser snapshot -i 2>/dev/null)
# The lookup may resolve (preview) or fall back to manual entry, but the
# validator must not reject the X check digit.
echo "$snapshot" | grep -qi "valid 10 or 13 digit ISBN" && fail "Validation rejected ISBN-10 ending in X"
pass "ISBN-10 with X check digit passed validation"

# Test 6: Typed 13-digit ISBN path still works end-to-end to the preview
info "Test: Typed ISBN lookup reaches preview"
# Reload to reset the add form (Test 5 may have left it in preview/manual mode)
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
open_add_form
snapshot=$(agent-browser snapshot -i 2>/dev/null)
isbn_ref=$(find_ref "$snapshot" "Enter ISBN")
[ -n "$isbn_ref" ] || fail "ISBN input ref not found after reload"
agent-browser fill "$isbn_ref" "9780140449136" >/dev/null 2>&1  # Crime and Punishment
snapshot=$(agent-browser snapshot -i 2>/dev/null)
lookup_ref=$(find_ref "$snapshot" "look up book\|looking up")
[ -n "$lookup_ref" ] || fail "Look Up Book button not found"
agent-browser click "$lookup_ref" >/dev/null 2>&1

# Open Library can be slow; poll for the preview
found=""
for _ in 1 2 3 4 5; do
  sleep 2
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "Add to Shelf"; then
    found="yes"
    break
  fi
done
[ -n "$found" ] || fail "Typed-ISBN lookup did not reach the preview (no 'Add to Shelf')"
echo "$snapshot" | grep -qi "Crime and Punishment" || fail "Preview did not show the looked-up title"
pass "Typed-ISBN lookup reached the preview"

# Close the preview without adding, to leave the shelf unchanged
cancel_ref=$(find_ref "$snapshot" "\"Cancel\"")
[ -n "$cancel_ref" ] && agent-browser click "$cancel_ref" >/dev/null 2>&1

echo ""
pass "Scanner journey complete!"
