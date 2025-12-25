#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

mkdir -p web/fibviz
bin/iris run-wasm examples/real/apps/fib_viz.iris --no-run --wasm-out web/fibviz/fib_viz.wasm
if base64 --help 2>&1 | grep -q -- '--output'; then
  base64 --input web/fibviz/fib_viz.wasm --output web/fibviz/fib_viz.wasm.b64
elif base64 --help 2>&1 | grep -q -- '-o'; then
  base64 -i web/fibviz/fib_viz.wasm -o web/fibviz/fib_viz.wasm.b64
else
  base64 < web/fibviz/fib_viz.wasm > web/fibviz/fib_viz.wasm.b64
fi
echo "Wrote web/fibviz/fib_viz.wasm"
echo "Wrote web/fibviz/fib_viz.wasm.b64"
