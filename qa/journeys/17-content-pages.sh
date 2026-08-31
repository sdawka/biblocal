#!/usr/bin/env bash
# Journey: Content Pages
# Tests: smoke-test /about, /how-it-works, /blog, one blog post, and the
#        French pages (/fr, /fr/biblio, /fr/about — the actual fr routes in
#        src/pages/fr/). Asserts 200-level responses, expected heading text
#        (French strings on fr pages), and that the LanguageSwitcher links
#        route to the right locale paths.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/helpers.sh"

echo "═══════════════════════════════════════"
echo "Journey 17: Content Pages"
echo "═══════════════════════════════════════"

# HTTP-level smoke: the page must respond 2xx (no redirect-to-login, no 404).
assert_http_ok() {
  local path="$1"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL$path")
  if [[ "$code" =~ ^2 ]]; then
    pass "GET $path → $code"
  else
    fail "GET $path returned $code (expected 2xx)"
  fi
}

# Open a page in the browser and assert a text pattern renders.
open_and_assert() {
  local path="$1"
  local pattern="$2"
  agent-browser open "$BASE_URL$path" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1
  local snapshot
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "$pattern"; then
    pass "$path renders '$pattern'"
  else
    fail "$path missing expected text '$pattern'"
  fi
}

# ── English content pages ────────────────────────────────────────────────

info "Test: English content pages respond"
assert_http_ok "/about"
assert_http_ok "/how-it-works"
assert_http_ok "/blog"
assert_http_ok "/blog/biblocal-vs-goodreads"

info "Test: English page headings"
open_and_assert "/about" "Books belong to everyone"
open_and_assert "/how-it-works" "How your shelf"
open_and_assert "/blog" "Articles"

info "Test: Blog index links to posts"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
post_ref=$(echo "$snapshot" | grep -i "goodreads" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$post_ref" ] || fail "No Goodreads-related post link found on /blog"
agent-browser click @"$post_ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1
assert_url "/blog/"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
echo "$snapshot" | grep -qi "goodreads" || fail "Blog post page missing its title text"
pass "Blog post page renders"

# ── French pages ─────────────────────────────────────────────────────────

info "Test: French pages respond"
assert_http_ok "/fr"
assert_http_ok "/fr/about"

info "Test: French page headings are in French"
open_and_assert "/fr" "Vous êtes ce que"
open_and_assert "/fr/about" "livres appartiennent"

# /fr/biblio is auth-protected; only reachable directly in QA mode.
if is_qa_mode; then
  assert_http_ok "/fr/biblio"
  open_and_assert "/fr/biblio" "Votre bibliothèque"
else
  info "Skipping /fr/biblio checks (auth-protected outside QA mode)"
fi

# ── LanguageSwitcher routing ─────────────────────────────────────────────

info "Test: LanguageSwitcher EN→FR on /about"
agent-browser open "$BASE_URL/about" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1
snapshot=$(agent-browser snapshot -i 2>/dev/null)
fr_ref=$(echo "$snapshot" | grep '"FR"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$fr_ref" ] || fail "FR link not found in LanguageSwitcher on /about"
agent-browser click @"$fr_ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1
assert_path "/fr/about"

info "Test: LanguageSwitcher FR→EN on /fr/about"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
en_ref=$(echo "$snapshot" | grep '"EN"' | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$en_ref" ] || fail "EN link not found in LanguageSwitcher on /fr/about"
agent-browser click @"$en_ref" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1
assert_path "/about"

echo ""
pass "Content pages journey complete!"
