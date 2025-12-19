# WASM Host ABI (Draft)

This document defines the host import surface for running IRIS-generated WASM in browser or server runtimes.

## Import Module
Module name: `host`

All functions use 64-bit integers (`i64`) for pointers/handles. Strings are UTF-8 with a 64-bit length header:
```
[len: i64][bytes...]
```

## Functions (Proposed)
### Logging
- `host.print(ptr: i64) -> i64`
  - Prints a string at `ptr` (Iris string layout).
  - Returns `0` on success, non-zero on error.

### Tools (Host-Provided)
- `host.tool_call(name_ptr: i64, args_ptr: i64) -> i64`
  - `name_ptr`: Iris string tool name.
  - `args_ptr`: pointer to serialized argument list (format TBD).
  - Returns pointer to serialized result or error.

### Filesystem
- `host.fs_read(path_ptr: i64) -> i64`
  - Returns pointer to `Result<Str, Str>` payload (format TBD).
- `host.fs_write(path_ptr: i64, data_ptr: i64) -> i64`
  - Returns pointer to `Result<I64, Str>` payload (format TBD).
- `host.fs_exists(path_ptr: i64) -> i64`
  - Returns `0/1` boolean.
- `host.fs_read_dir(path_ptr: i64) -> i64`
  - Returns pointer to `Result<List<Str>, Str>` payload (format TBD).

### Network (Optional)
- `host.net_listen(port: i64) -> i64`
- `host.net_accept(handle: i64) -> i64`
- `host.net_read(handle: i64) -> i64`
- `host.net_write(handle: i64, data_ptr: i64) -> i64`
- `host.net_close(handle: i64) -> i64`
- `host.net_connect(host_ptr: i64, port: i64) -> i64`

## Notes
- Serialization for tool arguments/results and Result/Option/Record should mirror IRIS value encoding. A small binary schema is preferred over JSON for size.
- First implementation can use JSON for simplicity, then swap to binary later.
- Errors should return a typed `Result` payload where possible, not trap.

## Next Steps
1. Decide value serialization format (JSON vs binary).
2. Implement a TypeScript host shim with these imports.
3. Add a minimal WASM test that calls `host.print` and a tool.
