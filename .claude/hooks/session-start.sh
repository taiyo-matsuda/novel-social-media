#!/bin/bash
# クラウド（Claude Code on the web）のセッション開始時に依存関係を入れる
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
cd "$CLAUDE_PROJECT_DIR"
pnpm install --frozen-lockfile
