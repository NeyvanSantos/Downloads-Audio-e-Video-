#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# Deploy the reviewed main revision using the same workflow as automatic deploys.
gh workflow run deploy.yml --ref main
