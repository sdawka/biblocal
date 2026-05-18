#!/bin/bash
# QA Scenario Loader
# Usage: ./scripts/qa-scenario.sh <scenario>
#
# Scenarios:
#   empty    - Fresh user, no profile, no books (onboarding tests)
#   power    - 50+ books, pending connections (scale tests)
#   matches  - Pratchett fans with overlapping books (match tests)
#   edge     - Edge cases: rate limits, declined, no location, etc.
#   minimal  - Just QA user with 2 books (fast iteration)

set -e

SCENARIO=$1

if [ -z "$SCENARIO" ]; then
  echo "Usage: $0 <scenario>"
  echo ""
  echo "Scenarios:"
  echo "  empty    - Fresh user, no profile, no books"
  echo "  power    - 50+ books, pending connections"
  echo "  matches  - Pratchett fans with overlapping books"
  echo "  edge     - Edge cases: rate limits, declined, etc."
  echo "  minimal  - Just QA user with 2 books"
  exit 1
fi

case $SCENARIO in
  empty)    FILE="scripts/scenarios/seed-empty.sql" ;;
  power)    FILE="scripts/scenarios/seed-power-user.sql" ;;
  matches)  FILE="scripts/seed-qa.sql" ;;
  edge)     FILE="scripts/scenarios/seed-edge-cases.sql" ;;
  minimal)  FILE="scripts/scenarios/seed-minimal.sql" ;;
  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Run '$0' without arguments to see available scenarios."
    exit 1
    ;;
esac

echo "Loading scenario: $SCENARIO"
npx wrangler d1 execute biblocal-qa-db --env qa --remote --file="$FILE"
echo ""
echo "✓ Scenario '$SCENARIO' loaded successfully"
