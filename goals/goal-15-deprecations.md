# Deprecation strategy (language + libraries)

## Motivation
Iris is early-stage and breaking changes are acceptable, but we still need a predictable way to evolve:
- built-in types and core syntax
- stdlib modules and APIs
- user-level types and file-based modules

A lightweight deprecation system reduces churn, makes LSP guidance possible, and helps users migrate.

## Goals
- Clear, machine-readable deprecation metadata.
- Warnings surfaced in LSP and CLI checks.
- Simple migration guidance embedded in source.

## Plan
1. **Deprecation annotations**
   - Add `(deprecated ...)` metadata on `type`, `deffn`, and `module` forms.
   - Support fields: `since`, `until`, `message`, `replacement`.
   - Example:
     ```iris
     (deffn (name foo)
       (deprecated (since "0.3") (until "0.5") (message "Use bar") (replacement "bar"))
       ...)
     ```
2. **Built-in types and syntax**
   - Maintain a versioned map of deprecated built-ins (name -> metadata).
   - Emit warnings when used; error once `until` is reached.
3. **File/module deprecation**
   - Allow module-level `(deprecated ...)` so entire files can be flagged.
   - LSP should surface module deprecation on import.
4. **Tooling integration**
   - `bin/iris check` reports deprecation warnings with location + replacement.
   - LSP diagnostics: warnings for deprecated usage, info for upcoming removals.
   - Optional quick-fix: replace with `replacement` symbol if safe.
5. **Version policy**
   - Define a simple policy: deprecations live for N minor versions.
   - Track removals in `PROJECT_STATUS.md` or a changelog.

## Success criteria
- Deprecation warnings appear in LSP and CLI.
- Deprecated symbols show hover notes with replacements.
- Removing a deprecated feature is mechanical and auditable.
