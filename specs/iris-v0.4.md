# IRIS v0.4 Specification (Draft)

## 1. Modules & Imports

### Syntax
```lisp
(program
  (module (name "main") (version 0))
  (imports
    (import "utils.iris" (as "U")))
  (defs
    ...
    (body (U.add 1 2))))
```

### AST Changes
*   New `Import` node: `{ path: string, alias: string }`.
*   `Program` node adds `imports: Import[]`.
*   `Call` node need to support Namespaced ID `U.add`.

### Resolution Rules
1.  **Path Resolution**:
    *   Imports are relative to the current file.
    *   No circular imports allowed in v0.4 (keep it simple: DAG).
2.  **Scope**:
    *   Imported functions are accessed via `Alias.functionName`.
    *   Imported constants are `Alias.constName`.
3.  **Visibility**:
    *   By default, all `deffn` / `defconst` are public (exported).
    *   (Future: `(private ...)` tag).

## 2. Generics (Tentative)
*   `(struct (Box T) ...)` - Postponed until Modules are working.

## 3. Dot Access (Syntax Sugar)

Dot access is a parser-level convenience that desugars to intrinsics.

### Syntax
```lisp
foo.bar        ;; field access
foo.0          ;; tuple index access
foo.bar.baz    ;; chained access
```

### Desugaring
```lisp
foo.bar        => (record.get foo "bar")
foo.0          => (tuple.get foo 0)
foo.bar.baz    => (record.get (record.get foo "bar") "baz")
```

### Constraints
- Field names and tuple indexes are literals in the surface syntax.
- Chained access always desugars left-to-right.
