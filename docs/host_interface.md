# IRIS Host Interface (Wasm)

This document summarizes the host interface for running IRIS-generated WebAssembly.

## Memory layouts

### String
```
[len: i64][bytes...]
```

### List of pointers
```
[len: i64][ptr1: i64][ptr2: i64]...
```

### Record
```
[len: i64][key_ptr: i64][val_ptr: i64]...
```

## Imports (module `host`)

### Text + strings
- `host.print(ptr: i64) -> i64`
- `host.parse_i64(ptr: i64) -> i64`
- `host.i64_to_string(val: i64) -> i64`
- `host.str_concat(a: i64, b: i64) -> i64`
- `host.str_concat_temp(a: i64, b: i64) -> i64`
- `host.str_eq(a: i64, b: i64) -> i64`
- `host.temp_reset() -> i64`

### Runtime helpers
- `host.args_list() -> i64`
- `host.rand_u64() -> i64`
- `host.record_get(record_ptr: i64, key_ptr: i64) -> i64`

### Tools
- `host.tool_call_json(name_ptr: i64, args_ptr: i64) -> i64`

## Exports
- `memory`
- `main() -> i64`
- `alloc(size: i64) -> i64` (optional but preferred)

## References
- `docs/WASM-ABI.md`
- `docs/profiles.md`
