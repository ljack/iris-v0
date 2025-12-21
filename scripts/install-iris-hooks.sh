#!/bin/sh
set -e

root="$(cd "$(dirname "$0")/.." && pwd)"
hooks_dir="$root/.git/hooks"
hook="$hooks_dir/pre-commit"

cat > "$hook" <<'EOF'
#!/bin/sh
set -e
root="$(git rev-parse --show-toplevel)"
cd "$root"
files="$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.iris$' || true)"
if [ -z "$files" ]; then
  exit 0
fi
fail=0
for file in $files; do
  if [ -f "$file" ]; then
    if ! ./bin/iris check "$file"; then
      fail=1
    fi
  fi
done
if [ "$fail" -ne 0 ]; then
  echo "Iris check failed; aborting commit." >&2
  exit 1
fi
EOF

chmod +x "$hook"
echo "Installed Iris pre-commit hook at $hook"
