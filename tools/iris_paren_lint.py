#!/usr/bin/env python3
"""
iris_paren_lint.py

Lint Iris S-expr source files for balanced parentheses.

Features:
- Reports unmatched ')' with exact line:col.
- Reports unclosed '(' and points to where it was opened.
- Ignores parentheses inside double-quoted strings (supports \" and \\ escapes).
- Ignores ;; line comments (from ;; to end of line), except when inside a string.

Usage:
  python iris_paren_lint.py path/to/file.iris
  python iris_paren_lint.py path/to/file.iris --context 2
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Optional


@dataclass(frozen=True)
class Pos:
    line: int   # 1-based
    col: int    # 1-based

@dataclass(frozen=True)
class ParenOpen:
    pos: Pos


def lint_text(text: str) -> Tuple[List[str], List[ParenOpen]]:
    errors: List[str] = []
    stack: List[ParenOpen] = []

    in_string = False
    escape = False
    in_comment = False

    line = 1
    col = 0  # will increment before use for char columns

    i = 0
    n = len(text)

    while i < n:
        ch = text[i]
        col += 1

        # Track newlines first (reset comment state on newline)
        if ch == "\n":
            in_comment = False
            in_string = in_string  # unchanged
            escape = False          # escape doesn't carry across newline
            line += 1
            col = 0
            i += 1
            continue

        # Comment start: ;; (only if not in string/comment already)
        if not in_string and not in_comment and ch == ";":
            nxt = text[i + 1] if i + 1 < n else ""
            if nxt == ";":
                in_comment = True
                # consume second ';' as part of comment marker
                i += 2
                col += 1
                continue

        if in_comment:
            i += 1
            continue

        # String handling
        if in_string:
            if escape:
                escape = False
                i += 1
                continue
            if ch == "\\":
                escape = True
                i += 1
                continue
            if ch == '"':
                in_string = False
                i += 1
                continue
            i += 1
            continue
        else:
            if ch == '"':
                in_string = True
                i += 1
                continue

        # Paren handling (only when not in string/comment)
        if ch == "(":
            stack.append(ParenOpen(Pos(line=line, col=col)))
        elif ch == ")":
            if not stack:
                errors.append(f"Unmatched ')' at {line}:{col}")
            else:
                stack.pop()

        i += 1

    return errors, stack


def format_unclosed(stack: List[ParenOpen]) -> List[str]:
    # Report from most-recent to oldest (useful for debugging)
    msgs: List[str] = []
    for op in reversed(stack):
        msgs.append(f"Unclosed '(' opened at {op.pos.line}:{op.pos.col}")
    return msgs


def show_context(path: Path, pos: Pos, context: int) -> str:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return ""

    start = max(1, pos.line - context)
    end = min(len(lines), pos.line + context)

    out: List[str] = []
    for ln in range(start, end + 1):
        prefix = ">" if ln == pos.line else " "
        line_text = lines[ln - 1]
        out.append(f"{prefix} {ln:5d} | {line_text}")
        if ln == pos.line:
            caret_col = max(1, min(pos.col, len(line_text) + 1))
            out.append(f"        | {' ' * (caret_col - 1)}^")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", type=str, help="Path to .iris file")
    ap.add_argument("--context", type=int, default=0, help="Show N lines of context around each reported position")
    args = ap.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        return 2

    text = path.read_text(encoding="utf-8")
    errors, stack = lint_text(text)

    msgs = []
    msgs.extend(errors)
    msgs.extend(format_unclosed(stack))

    if not msgs:
        print(f"OK: parentheses balanced: {path}")
        return 0

    print(f"FAIL: {path}")
    for m in msgs:
        print(f"- {m}")
        if args.context > 0:
            # Extract position from message if present
            pos: Optional[Pos] = None
            if " at " in m and ":" in m.split(" at ", 1)[1]:
                tail = m.split(" at ", 1)[1]
                try:
                    l_s, c_s = tail.split(":", 1)
                    pos = Pos(line=int(l_s), col=int(c_s))
                except Exception:
                    pos = None
            if pos is None and " opened at " in m and ":" in m.split(" opened at ", 1)[1]:
                tail = m.split(" opened at ", 1)[1]
                try:
                    l_s, c_s = tail.split(":", 1)
                    pos = Pos(line=int(l_s), col=int(c_s))
                except Exception:
                    pos = None

            if pos is not None:
                ctx = show_context(path, pos, args.context)
                if ctx:
                    print(ctx)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
