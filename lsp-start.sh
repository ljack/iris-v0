#!/bin/bash
# LSP Server launcher for Zed
cd "$(dirname "$0")"
exec node dist/src/lsp-server.js --stdio
