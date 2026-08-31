#!/usr/bin/env bash
# Deploy biblocal QA environment to biblocal-qa
set -euo pipefail

echo "╔═══════════════════════════════════════════════╗"
echo "║     Deploying biblocal-qa Environment         ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# Run migrations on QA database.
# Fail loudly: a failed migration must abort the deploy rather than ship code
# against a schema that was never created. (Migration tracking is reconciled
# with the actual schema, so a clean DB applies in order and an up-to-date one
# is a no-op — neither should error.)
echo "→ Running migrations on QA database..."
npx wrangler d1 migrations apply biblocal-qa-db --env qa --remote

# Seed data
echo "→ Seeding QA data..."
npx wrangler d1 execute biblocal-qa-db --env qa --remote --file=scripts/seed-qa.sql || {
  echo "  Seed failed - this is OK if data already exists"
}

# Build
echo "→ Building..."
npm run build

# Patch generated wrangler.json for QA deployment
# Astro's cloudflare adapter doesn't respect env-specific names, so we patch it
echo "→ Patching wrangler config for QA..."
bash scripts/prepare-qa-deploy-config.sh

# Deploy to QA environment using patched config
echo "→ Deploying to Cloudflare Workers (biblocal-qa)..."
npx wrangler deploy --config dist/server/wrangler-qa.json

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║     ✓ biblocal-qa Deployed!                   ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "Features:"
echo "  • No authentication required (QA_MODE=true)"
echo "  • Pre-seeded test data:"
echo "    - 1 QA user with 6 books"
echo "    - 9 other users for matching tests (incl. 5 global cities)"
echo "    - 5 bookstores"
echo ""
echo "To re-seed data:"
echo "  npx wrangler d1 execute biblocal-qa-db --env qa --remote --file=scripts/seed-qa.sql"
echo ""
echo "To run QA tests:"
echo "  BASE_URL=<deployed-url> QA_MODE=true ./qa/run-all.sh"
