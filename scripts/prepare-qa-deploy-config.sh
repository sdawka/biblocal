#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

jq '.name = "biblocal-qa" |
    .vars.QA_MODE = "true" |
    .vars.ENVIRONMENT = "qa" |
    .vars.QA_USER_ID = "qa-test-user" |
    .vars.PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_aHVtYW5lLWxvbmdob3JuLTY2LmNsZXJrLmFjY291bnRzLmRldiQ" |
    .d1_databases[0].database_name = "biblocal-qa-db" |
    .d1_databases[0].database_id = "44e7e517-033b-40ea-a540-ca66ee777ea1"' \
    dist/server/wrangler.json > dist/server/wrangler-qa.json
