#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  --android) pnpm exec expo start --android ;;
  --ios) pnpm exec expo start --ios ;;
  --web) pnpm exec expo start --web ;;
  --tunnel) pnpm exec expo start --tunnel ;;
  --export-web) pnpm exec expo export --platform web ;;
  --help) echo 'Usage: build_and_run.sh [--android|--ios|--web|--tunnel|--export-web]' ;;
  *) pnpm exec expo start ;;
esac
