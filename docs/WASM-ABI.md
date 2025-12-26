# WASM Host ABI

This document defines the host import surface for running IRIS-generated WASM in browser or server runtimes.

## Import Module
Module name: `host`

All functions use 64-bit integers (`i64`) for pointers/handles. Strings are UTF-8 with a 64-bit length header:
```
[len: i64][bytes...]
```

### Common layout types
- **List of pointers**: `[len: i64][ptr1: i64][ptr2: i64]...`
- **Record**: `[len: i64][key_ptr: i64][val_ptr: i64]...`

## Current host imports (v0.5.x)

### Logging / formatting
- `host.print(ptr: i64) -> i64`  
  Prints a string at `ptr`. Returns `0` on success.
- `host.parse_i64(ptr: i64) -> i64`  
  Parses an Iris string into an `i64`.
- `host.i64_to_string(val: i64) -> i64`  
  Returns an Iris string pointer for `val`.
- `host.str_concat(a: i64, b: i64) -> i64`  
  Allocates a new string `a + b`.
- `host.str_concat_temp(a: i64, b: i64) -> i64`  
  Allocates in the temp buffer.
- `host.str_eq(a: i64, b: i64) -> i64`  
  Returns `1` if equal, else `0`.
- `host.temp_reset() -> i64`  
  Resets temp buffer cursor.

### Runtime helpers
- `host.args_list() -> i64`  
  Returns list of argument string pointers.
- `host.rand_u64() -> i64`  
  Random `u64` (effectful).
- `host.record_get(record_ptr: i64, key_ptr: i64) -> i64`  
  Returns the value pointer for a record field or traps on missing.

### Tool host
- `host.tool_call_json(name_ptr: i64, args_ptr: i64) -> i64`  
  JSON bridge for tools. `args_ptr` points to an Iris string containing JSON.

## Exports
- `memory`: linear memory
- `main() -> i64`: entry point
- `alloc(size: i64) -> i64`: optional allocator (preferred by host)

## Notes
- JSON tool calls are the initial bridge; binary format can replace this later.
- Errors should return typed `Result` payloads where possible (avoid traps).

## Related docs
- `docs/host_interface.md`
- `docs/profiles.md`
