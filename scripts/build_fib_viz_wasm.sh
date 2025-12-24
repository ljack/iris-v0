#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

mkdir -p web/fibviz
bin/iris run-wasm examples/real/apps/fib_viz.iris --no-run --wasm-out web/fibviz/fib_viz.wasm
echo "Wrote web/fibviz/fib_viz.wasm"
