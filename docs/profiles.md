# IRIS Host Profiles

Host profiles define which capabilities an environment grants. They are used to
restrict side effects for determinism and safety.

## Profiles

### `pure`
- Capabilities: `!Pure`
- Intended for deterministic execution only.
- Host imports: none required.

### `browser_playground`
- Capabilities: `!Pure`, `!IO`, `!Net`, `!Clock`, `!Rand`
- Intended for browser demos and playgrounds.
- Host imports (current wasm ABI): `host.print`, `host.parse_i64`, `host.i64_to_string`,
  `host.str_concat`, `host.str_concat_temp`, `host.str_eq`, `host.temp_reset`,
  `host.args_list`, `host.record_get`, `host.rand_u64`, `host.tool_call_json`.

### `server_agent`
- Capabilities: `!Pure`, `!IO`, `!Net`, `!FS`, `!Clock`, `!Rand`
- Intended for server-side agents with explicit capability grants.

### `iot_min`
- Capabilities: `!Pure`, `!IO`, `!Device`, `!Clock`
- Intended for embedded hosts with device bindings.

## Notes
- `docs/WASM-ABI.md` documents the current wasm host imports.
- Profiles are validated by `src/runtime/capabilities.ts` and `src/host/capabilities.ts`.
