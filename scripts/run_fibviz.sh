#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[fibviz] Building wasm..."
"$ROOT_DIR/scripts/build_fib_viz_wasm.sh"

echo "[fibviz] Starting Iris server on http://localhost:8080"
echo "[fibviz] Open http://localhost:8080 in your browser."
"$ROOT_DIR/bin/iris" run "$ROOT_DIR/examples/real/apps/fibviz_server.iris"
