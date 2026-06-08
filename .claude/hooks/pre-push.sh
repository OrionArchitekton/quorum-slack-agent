#!/usr/bin/env bash
# Repo-local pre-push test gate for Quorum.
# Blocks push if typecheck, unit tests, or workflow integration tests fail.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
echo "[pre-push] typecheck…"
pnpm typecheck
echo "[pre-push] unit tests…"
pnpm test
echo "[pre-push] workflow integration tests…"
pnpm test:int
echo "[pre-push] ✓ all gates passed"
