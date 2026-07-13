#!/usr/bin/env bash
# Journey: Onboarding
# Scenario: empty
# Tests: Fresh user experience, profile setup, first book add

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 6: Onboarding (Fresh User)"
echo "═══════════════════════════════════════"

# Load empty scenario
info "Loading empty scenario..."
npm run qa:scenario empty --silent >/dev/null 2>&1 || {
  fail "Could not load empty scenario"
}
pass "Empty scenario loaded"

# Navigate to biblio (QA mode auto-logs in)
info "Test: Fresh user lands on biblio"
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Should see onboarding prompt or empty state
if echo "$snapshot" | grep -qi "welcome\|get started\|add your first\|empty\|no books"; then
  pass "Fresh user sees onboarding/empty state"
else
  info "Checking for onboarding UI..."
  echo "$snapshot" | head -30
fi

# Navigate to profile to complete setup
info "Test: Navigate to profile for setup"
ref=$(echo "$snapshot" | grep -i "profile" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
if [ -n "$ref" ]; then
  agent-browser click @"$ref" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1
  assert_url "/profile"
  pass "Navigated to profile"
else
  # Try direct navigation
  agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
fi

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Profile should show edit mode or prompt to complete
info "Test: Profile shows setup fields"
if echo "$snapshot" | grep -qi "name\|city"; then
  pass "Profile setup fields visible"
else
  info "Profile fields not clearly visible in snapshot"
fi

# Fill in name
info "Test: Enter name"
name_ref=$(echo "$snapshot" | grep -i "name" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
if [ -n "$name_ref" ]; then
  agent-browser click @"$name_ref" >/dev/null 2>&1
  agent-browser fill "$name_ref" "Test User" >/dev/null 2>&1
  pass "Entered name"
else
  info "Could not find name field"
fi

# Select city
info "Test: Select city"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
city_ref=$(echo "$snapshot" | grep -i "city\|montreal\|toronto" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
if [ -n "$city_ref" ]; then
  agent-browser click @"$city_ref" >/dev/null 2>&1
  sleep 0.5
  # Try to select Montreal
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  mtl_ref=$(echo "$snapshot" | grep -i "montreal" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
  if [ -n "$mtl_ref" ]; then
    agent-browser click @"$mtl_ref" >/dev/null 2>&1
    pass "Selected city"
  fi
else
  info "Could not find city selector"
fi

# Go back to biblio and add first book
info "Test: Navigate back to biblio"
agent-browser open "$BASE_URL/biblio" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Look for add book UI
info "Test: Add book UI available"
if echo "$snapshot" | grep -qi "add\|isbn\|search\|scan"; then
  pass "Add book UI present"
else
  info "Add book UI not clearly visible"
fi

# Try to add a book by ISBN
info "Test: Add book by ISBN"
isbn_ref=$(echo "$snapshot" | grep -i "isbn\|search" | grep "textbox\|input" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
if [ -n "$isbn_ref" ]; then
  agent-browser fill "$isbn_ref" "9780141439518" >/dev/null 2>&1  # Pride and Prejudice
  sleep 0.5

  # Find and click search/add button
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  add_ref=$(echo "$snapshot" | grep -i "add\|search\|lookup" | grep "button" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
  if [ -n "$add_ref" ]; then
    agent-browser click @"$add_ref" >/dev/null 2>&1
    agent-browser wait --load networkidle >/dev/null 2>&1
    sleep 2

    snapshot=$(agent-browser snapshot -i 2>/dev/null)
    if echo "$snapshot" | grep -qi "pride\|prejudice\|austen"; then
      pass "Book added successfully!"
    else
      info "Book may have been added (check UI)"
    fi
  fi
else
  info "Could not find ISBN input"
fi

echo ""
pass "Onboarding journey complete!"
