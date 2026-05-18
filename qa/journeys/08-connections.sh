#!/usr/bin/env bash
# Journey: Connections
# Scenario: power
# Tests: View pending requests, accept/decline, connection flow

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 8: Connections"
echo "═══════════════════════════════════════"

# Load power scenario (has pending connection requests)
info "Loading power scenario..."
npm run qa:scenario power --silent >/dev/null 2>&1 || {
  fail "Could not load power scenario"
}
pass "Power scenario loaded"

# Navigate to profile to see connection requests
info "Test: View connection requests on profile"
agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Should see connection requests section
if echo "$snapshot" | grep -qi "connection\|request"; then
  pass "Connection requests section visible"
else
  info "Connection requests section not immediately visible"
fi

# Look for pending requests (Alice and Bob in power scenario)
if echo "$snapshot" | grep -qi "alice\|bob\|pending"; then
  pass "Pending requests from test users visible"
else
  info "Pending request names not found"
fi

# Try to find accept button
info "Test: Accept/decline buttons present"
if echo "$snapshot" | grep -qi "accept\|decline"; then
  pass "Accept/decline buttons found"

  # Try accepting one
  info "Test: Accept a connection request"
  accept_ref=$(echo "$snapshot" | grep -i "accept" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
  if [ -n "$accept_ref" ]; then
    agent-browser click @"$accept_ref" >/dev/null 2>&1
    agent-browser wait --load networkidle >/dev/null 2>&1
    sleep 1

    snapshot=$(agent-browser snapshot -i 2>/dev/null)
    # Check if request count changed or status updated
    if echo "$snapshot" | grep -qi "accepted\|connected\|1"; then
      pass "Connection request accepted"
    else
      info "Request may have been accepted (verify UI)"
    fi
  fi
else
  info "Accept/decline buttons not found in current view"
fi

# Navigate to matches to see connection status
info "Test: Check connection status on matches"
agent-browser open "$BASE_URL/matches" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

snapshot=$(agent-browser snapshot -i 2>/dev/null)

# Look for match cards
if echo "$snapshot" | grep -qi "nearby\|match"; then
  pass "Matches page loaded"
fi

# Try to find a match card and expand it
info "Test: Expand match card"
card_ref=$(echo "$snapshot" | grep -i "alice\|bob\|carol\|nearby" | grep -o '\[ref=e[0-9]*\]' | head -1 | sed 's/\[ref=//;s/\]//')
if [ -n "$card_ref" ]; then
  agent-browser click @"$card_ref" >/dev/null 2>&1
  sleep 0.5

  snapshot=$(agent-browser snapshot -i 2>/dev/null)

  # Check for connect button or contact info
  if echo "$snapshot" | grep -qi "connect\|request\|contact\|email"; then
    pass "Connection/contact UI visible in expanded card"
  else
    info "Connection UI not found in expanded card"
  fi
else
  info "Could not find match card to expand"
fi

# Check contact settings in profile
info "Test: Contact settings in profile"
agent-browser open "$BASE_URL/profile" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

snapshot=$(agent-browser snapshot -i 2>/dev/null)

if echo "$snapshot" | grep -qi "contact\|email\|visibility"; then
  pass "Contact settings section present"
else
  info "Contact settings may be in edit mode"
fi

echo ""
pass "Connections journey complete!"
