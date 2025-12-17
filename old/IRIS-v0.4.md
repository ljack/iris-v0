# IRIS v0.4 Specification (Draft)

## Overview
IRIS v0.4 introduces modularity, network capabilities, and a CLI tool, transforming IRIS from a theoretical language into a practical one.

## 1. Modules
- **Syntax**: `(program (module (name "mod") (version 0)) (imports (import "other")) (defs ...))`
- **Resolution**:
  - `(call mod.func arg)`: Cross-module call.
  - Circular imports are detected and rejected.
- **Type Checking**:
  - Types and effects are checked across module boundaries.

## 2. Networking (`!Net` Effect)
- **Effect**: `!Net` is a new system effect.
  - Hierarchy: `!Net` > `!IO` (Network implies IO capabilities, for now treated as distinct or super-capability. In current implementation `!Net` allows `!IO` calls).
- **Intrinsics**:
  - `(net.listen port)`: Helper to creating server handle.
  - `(net.accept handle)`: Accept client connection.
  - `(net.read handle)`: Read data.
  - `(net.write handle data)`: Write data.
  - `(net.close handle)`: Close connection.
  - `(http.parse_request raw_str)`: Helper for parsing HTTP 1.1.

## 3. File System (`!IO` Effect)
- **Extensions**:
  - `(io.read_file path)`: Existing.
  - `(io.write_file path content)`: Write file.
  - `(io.file_exists path)`: Check existence.
  - `(io.read_dir path)`: List directory.
  - `(str.concat a b)`: String concatenation.
  - `(str.contains haystack needle)`: String check.

## 4. Syntax Enhancements
- **Comments**: `;; Comment` until end of line.
- **Record Access**: `req.path` (sugar for field access).
- **List Matching**:
    ```lisp
    (match list
      (case (tag "nil") ...)
      (case (tag "cons" (head tail)) ...))
    ```

## 5. CLI
- `iris run <file>`
- `iris check <file>`
