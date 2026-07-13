# biblocal QA Test Suite

Agentic browser-based tests for user journeys.

## Prerequisites

- `agent-browser` CLI installed
- Dev server running

## Quick Start

### Option 1: QA Mode (No Auth - Recommended)

```bash
# Start dev server in QA mode
npm run dev:qa

# Run tests against QA mode (no login needed)
QA_MODE=true ./qa/run-all.sh
```

### Option 2: With Clerk Auth

```bash
# Start regular dev server
npm run dev

# Run tests (requires Clerk test user)
./qa/run-all.sh
```

### Option 3: Deployed QA Environment

```bash
# Deploy QA environment to Cloudflare
npm run deploy:qa

# Run tests against deployed QA
BASE_URL=https://biblocal-qa.your-subdomain.workers.dev ./qa/run-all.sh
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:4321` | App URL |
| `TEST_EMAIL` | `qa+clerk_test@example.com` | Test user email |
| `TEST_PASSWORD` | `biblocalqa` | Test user password |
| `TEST_VERIFY_CODE` | `424242` | Clerk test mode verification code |

## User Journeys

### 1. Authentication (`01-auth.sh`)
- Home page shows login form
- Protected routes redirect to home when unauthenticated
- Login flow completes and redirects to `/biblio`
- Authenticated user on `/` redirects to `/biblio`
- Logout returns to home

### 2. Biblio Operations (`02-shelf.sh`)
- Biblio page structure (header, add book, book grid)
- Add book via ISBN lookup
- Book status controls
- Filter/sort functionality
- Empty state handling

### 3. Profile (`03-profile.sh`)
- Profile page sections (basic info, interests, optional)
- City/location selection
- Search radius control
- Topic picker
- Save functionality

### 4. Local (`04-matches.sh`)
- Map rendering (Leaflet)
- Match cards display
- Match facet types (shelf twin, mentor, etc.)
- Empty state
- Add bookstore action

### 5. Navigation (`05-navigation.sh`)
- Nav bar structure and links
- Active state indication
- Logo redirect behavior
- User menu functionality
- Mobile viewport

## Writing New Tests

Use helpers from `lib/helpers.sh`:

```bash
source "$SCRIPT_DIR/../lib/helpers.sh"

# Assertions
assert_url "/biblio"
assert_element "Your Shelf"

# Actions
login_test_user
logout_user
wait_and_snapshot

# Output
pass "Test passed"
fail "Test failed"
info "Info message"
```

## Debugging

Run with headed browser:
```bash
agent-browser --headed open http://localhost:4321
```

Take screenshots:
```bash
agent-browser screenshot --annotate
```

## Screenshots

Screenshots are saved to `~/.agent-browser/tmp/screenshots/` during test runs for visual verification of states that can't be asserted via accessibility tree.
