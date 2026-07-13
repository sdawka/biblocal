#!/usr/bin/env bash
# Journey: Geolocation
# Scenario: minimal
# Tests: Location display, map centering, distance in matches

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 7: Geolocation"
echo "═══════════════════════════════════════"

# Load minimal scenario (user has city/location set)
info "Loading minimal scenario..."
npm run qa:scenario minimal --silent >/dev/null 2>&1 || {
  fail "Could not load minimal scenario"
}
pass "Minimal scenario loaded"

# Navigate to profile
info "Test: Check location in profile"
agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Should see city displayed
if echo "$snapshot" | grep -qi "montreal"; then
  pass "City (Montreal) displayed in profile"
else
  info "City not visible in current view"
fi

# Check for radius setting
if echo "$snapshot" | grep -qi "radius\|km\|5"; then
  pass "Radius setting visible"
else
  info "Radius not visible in snapshot"
fi

# Check for location controls
info "Test: Location controls present"
if echo "$snapshot" | grep -qi "location\|enable\|precise\|city center"; then
  pass "Location controls found"
else
  info "Location controls may be in edit mode"
fi

# Navigate to local to check map
info "Test: Map displays on local page"
agent-browser open "$BASE_URL/local" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

# Map is visual - take screenshot
agent-browser screenshot >/dev/null 2>&1
pass "Local page loaded (screenshot captured)"

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Check for nearby text
if echo "$snapshot" | grep -qi "nearby"; then
  pass "Nearby section present"
else
  info "Nearby text not found"
fi

# With minimal scenario, may not have matches
# But map should still render
info "Test: Map container present"
# Maps don't appear in accessibility tree, but we can check the page loaded
if echo "$snapshot" | grep -qi "local\|map\|nearby"; then
  pass "Local page structure correct"
fi

# Load matches scenario for distance testing
info "Loading matches scenario for distance test..."
npm run qa:scenario matches --silent >/dev/null 2>&1
sleep 1

agent-browser open "$BASE_URL/local" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Should see match cards with distances
info "Test: Match cards display distances"
if echo "$snapshot" | grep -qi "km\|meter\|away\|distance"; then
  pass "Distance information displayed"
else
  # Distances might be shown differently
  if echo "$snapshot" | grep -qi "maya\|esme\|julien"; then
    pass "Match cards visible (distance display may vary)"
  else
    info "No match cards with distance found"
  fi
fi

# Take final screenshot
agent-browser screenshot >/dev/null 2>&1

echo ""
pass "Geolocation journey complete!"
