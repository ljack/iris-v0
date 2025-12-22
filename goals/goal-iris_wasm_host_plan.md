# IRIS Everywhere Runtime Plan (Wasm + Host Capabilities)

Audience: *antigravity* (implementation agent)

## Scope map
- This doc owns **runtime/host ABI + platform profiles**.
- Compiler backend evolution lives in `goals/goal-17-iris2wasm-backend-evolution.md`.
- Tool/host boundary principles live in `goals/goal-iris-wasm-plan-addenum-1.md`.

Goal: Run **AI-generated IRIS programs** safely and consistently on:
- Browsers
- Mobile phones
- IoT / embedded devices
- Desktops / laptops
- Servers / cloud

## 0. Outcome Targets

### Must-have
- **Same IRIS program** runs (or fails) consistently across platforms.
- **Effect safety**: programs can only perform effects explicitly allowed by the host.
- **Determinism by default**: pure code is reproducible; non-determinism is explicit.
- **Small footprint option** for IoT.

### Nice-to-have
- Component-model/WIT interface for clean host bindings
- Multiple “profiles” (browser/server/embedded) with the same core runtime

---

## 1. Architecture

### 1.1 Core runtime as a single Wasm module
Deliver `iris_runtime.wasm` implementing:
- Parser
- Typechecker
- Evaluator (interpreter)

Alternative (acceptable v1):
- Keep parser/typechecker in TS for tooling, but **ship evaluator in Wasm**.
- Still expose the same host interface; keep it compatible with “all-in-wasm” later.

### 1.2 Thin host adapters per platform
Each platform hosts `iris_runtime.wasm` and provides a small set of imports:
- Browser: JS imports
- Node/server: Wasmtime or Node-WASI imports
- Mobile: embedded Wasm runtime (or via JS bridge)
- IoT: wamr/wasm3 embedded host

The host is responsible for:
- Selecting a **capability profile**
- Wiring imports to local APIs
- Enforcing quotas/timeouts (fuel/instruction metering)
- Providing optional resources (fs/net/gpio/etc.)

---

## 2. Capability & Effect Model

### 2.1 IRIS effects map to host capabilities
Treat an IRIS effect annotation as a *required capability set*.

Example policy:
- `!Pure`: no imports beyond deterministic helpers
- `!IO`: enable `io.*`
- `!Net`: enable `net.*`
- `!FS`: enable `fs.*`
- `!Clock`: enable `clock.*` (note: makes results time-dependent)
- `!Rand`: enable `rand.*` (note: makes results nondeterministic)

Host enforces:
- If program requires capability not granted by profile → **reject before run**.

### 2.2 Capability profiles (recommended)
Define standard profiles so “anywhere” stays predictable:

**Profile: `pure`**
- Allowed: `log.debug` (optional), `limits.fuel_remaining`, `limits.request_yield`
- Denied: `io`, `net`, `fs`, `clock`, `rand`, `device`

**Profile: `browser_playground`**
- Allowed: `io.print`, `net.http_request` (CORS-limited), `clock.wall_ms`, `rand.u64`
- Denied: `fs` (unless sandboxed via IndexedDB wrapper), `device.*`

**Profile: `server_agent`**
- Allowed: `io`, `net`, *scoped* `fs` (capability-based directory handles), `clock`, `rand`
- Optional: `process.spawn` should be **denied by default**.

**Profile: `iot_min`**
- Allowed: `io.print`, `device.gpio_write`/`device.gpio_read`, `device.i2c_tx`/`device.i2c_rx`, `clock.monotonic_ms`
- Denied: `net` unless explicitly enabled

---

## 3. Host Interface (Imports) – Minimal v1

### 3.0 ABI versioning + capability map
- **ABI tag:** `iris-host-abi/0.1.0` (bump the minor when adding non-breaking imports; bump the major when changing signatures).
- Hosts surface the ABI tag and **reject modules** that declare a required ABI higher than the host supports or that request capabilities outside the active profile.
- Capability → import mapping (v0.1.0):
  - `!Pure` → `limits.fuel_remaining`, `limits.request_yield`, `log.debug`
  - `!IO` → `io.print_utf8`, `io.read_line`
  - `!Net` → `net.http_request`
  - `!FS` → `fs.open_dir`, `fs.read_file`, `fs.write_file`
  - `!Clock` → `clock.monotonic_ms`, `clock.wall_ms`
  - `!Rand` → `rand.u64`, `rand.bytes`
  - `!Device` → `device.gpio_write`, `device.gpio_read`, `device.i2c_tx`, `device.i2c_rx`

Profile matrix (✅ = import family available by default, ⚪️ = optional/host-flag):

| Profile | `!Pure` | `!IO` | `!Net` | `!FS` | `!Clock` | `!Rand` | `!Device` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pure` | ✅ |  |  |  |  |  |  |
| `browser_playground` | ✅ | ✅ | ✅ |  | ✅ | ✅ |  |
| `server_agent` | ✅ | ✅ | ✅ | ✅ (scoped) | ✅ | ✅ |  |
| `iot_min` | ✅ | ✅ |  |  | ✅ (monotonic) |  | ✅ |

Hosts may extend profiles, but any requested capability not granted by the active profile must fail with `E_CAPABILITY` **before** program execution.

### 3.1 Design rules
- Keep imports **small and stable**
- Prefer **copy-less** or bounded-copy patterns
- No ambient authority: every resource is a handle
- Return error codes + messages (no panics across boundary)

### 3.2 ABI choice
Pick one for v1:

**Option A (fastest to ship): C-style ABI**
- Use linear memory + functions:
  - `alloc(len) -> ptr`
  - `dealloc(ptr,len)`
  - `call(host_fn_id, ptr, len) -> (ptr2,len2,err)`
- Payloads encoded as CBOR or MessagePack.

**Option B (cleaner): WIT / Component Model**
- Define a WIT package `iris:host/*`
- Generate bindings for JS/TS + Rust/C/C++ hosts where available.

Recommendation:
- Start with **Option A** for speed and embedded friendliness.
- Plan migration to **Option B** once stable.

### 3.3 Common types
Encode values as **CBOR** (binary, small, good for embedded) with these shapes:
- `{"t":"int","v":123}`
- `{"t":"str","v":"hi"}`
- `{"t":"list","v":[...]}`
- `{"t":"rec","v":{"k":...}}`
- `{"t":"err","code":"E_IO","msg":"..."}`
Or use a compact tagged format if performance demands later.

### 3.4 Import surface (v1)

#### `io`
- `io.print_utf8(ptr,len) -> err_code`
  - prints a UTF-8 string (no implicit newline)
- `io.read_line(max_len) -> (ptr,len,err_code)` (optional)

#### `net` (optional in many profiles)
- `net.http_request(req_ptr, req_len) -> (resp_ptr, resp_len, err_code)`
  - Request CBOR:
    - `{method, url, headers, body_bytes, timeout_ms}`
  - Response CBOR:
    - `{status, headers, body_bytes}`

#### `fs` (server only, optionally browser sandbox)
- Resource handles:
  - `fs.open_dir(cap_ptr,cap_len) -> dir_handle` (cap is host-provided token)
  - `fs.read_file(dir_handle, path_ptr,path_len, max_bytes) -> (ptr,len,err)`
  - `fs.write_file(dir_handle, path_ptr,path_len, data_ptr,data_len) -> err`

#### `clock`
- `clock.monotonic_ms() -> u64` (preferred for deterministic-ish timing)
- `clock.wall_ms() -> u64` (explicitly nondeterministic)

#### `rand`
- `rand.u64() -> u64`
- Option: `rand.bytes(n) -> (ptr,len)`

#### `device` (IoT profile)
- `device.gpio_write(pin, value) -> err`
- `device.gpio_read(pin) -> (value, err)`
- `device.i2c_tx(bus, addr, data_ptr,data_len) -> err`
- `device.i2c_rx(bus, addr, n) -> (ptr,len, err)`

#### `limits`
- `limits.fuel_remaining() -> u64`
- `limits.request_yield() -> ()` (host may preempt)

---

## 4. Runtime Exports (Wasm → Host)

### 4.1 Primary entrypoints
- `iris_init(config_ptr, config_len) -> err`
- `iris_run(program_ptr, program_len, input_ptr, input_len) -> (out_ptr,out_len,err)`
- `iris_check(program_ptr, program_len) -> (diag_ptr,diag_len,err)` (optional)

### 4.2 Config CBOR
`config` example:
- `{"profile":"server_agent","max_steps":10_000_000,"max_bytes":50_000_000,"enable_tracing":false}`

---

## 5. Safety: Timeouts, Quotas, and Memory

### 5.1 Instruction metering / fuel
- Host must support metering:
  - Wasmtime: fuel / epoch interruption
  - Browser: cooperative checks + time budget
  - Embedded: host loop limits

Runtime must:
- Check for yield every N evaluator steps
- Abort with `E_LIMIT` when exceeded

### 5.2 Memory limits
- Set max linear memory pages per profile
- Bound all allocations and decode sizes
- Add `max_bytes` guard for host-returned buffers

### 5.3 Determinism rules
- `!Pure` runs must not call `clock.wall_ms` or `rand` or `net` etc.
- `clock.monotonic_ms` is still environment-dependent; treat as effectful.
- Ensure float behavior is consistent:
  - Prefer integer/rational arithmetic or define float semantics strictly.

---

## 6. Portability Notes (per platform)

### 6.1 Browser
- Use `WebAssembly.instantiateStreaming` when possible.
- Implement imports in JS:
  - `io.print_utf8` → append to UI console
  - `net.http_request` → `fetch` with CORS constraints

### 6.2 Node
- Option 1: Node’s WebAssembly + JS imports
- Option 2: WASI (only if you want stdio/fs via WASI)

Prefer: JS imports + explicit directory capabilities.

### 6.3 Servers
- Prefer Wasmtime for strong sandboxing + fuel.
- Capabilities:
  - Provide scoped directories and network allowlists.

### 6.4 Mobile
- Use a small runtime:
  - iOS: Wasmtime is heavy; consider Wasm3/WAMR or platform SDK runtimes.
  - Android: WAMR works well; or Wasmtime if acceptable.

### 6.5 IoT
- Choose between:
  - **wasm3**: very small, interpreter
  - **WAMR**: small, can do AOT, good embedded support

---

## 7. Implementation Steps (antigravity checklist)

### Phase 1 — Spec + scaffolding (1–2 days)
- [ ] Create `host_interface.md` with import/export signatures and CBOR schemas
- [ ] Add runtime export stubs: `iris_init`, `iris_run`
- [ ] Implement `alloc/dealloc` and buffer helpers
- [ ] Add `limits` checking hooks in evaluator loop

### Phase 2 — Browser host (2–4 days)
- [ ] Build `iris_runtime.wasm` and load in the playground
- [ ] Implement JS imports: `io.print_utf8`, `limits.fuel_remaining`, `limits.request_yield`
- [ ] Wire a `pure` and `browser_playground` profile
- [ ] Add conformance tests (same IRIS program yields same output)

### Phase 3 — Server host (2–5 days)
- [ ] Create Wasmtime runner `iris-runner` with:
  - fuel limit
  - memory limit
  - capability profile selection
- [ ] Implement `net.http_request` with allowlist
- [ ] Implement `fs` with directory capability tokens

### Phase 4 — Embedded host (time varies)
- [ ] Build a minimal C host for wasm3 or WAMR
- [ ] Implement `io.print_utf8` + `device.gpio_write`/`device.gpio_read`
- [ ] Run a “blink LED” IRIS sample under `iot_min`

### Phase 5 — Polish
- [ ] Structured diagnostics from `iris_check`
- [ ] Fuzz parsing/CBOR decoding
- [ ] Component-model migration plan (WIT)

---

## 8. Test Plan (must ship)

### 8.1 Conformance suite
- `tests/conformance/*.iris` with expected outputs
- Profiles:
  - `pure`
  - `browser_playground`
  - `server_agent`
  - `iot_min` (where available)

### 8.2 Negative tests
- Pure code that tries IO → must fail at load/run with clear error
- Oversized buffers → fail with `E_LIMIT` / `E_DECODE`
- Infinite recursion/loop → fuel timeout

---

## 9. Deliverables

- `iris_runtime.wasm`
- Host adapters:
  - `hosts/browser/*`
  - `hosts/node/*` (optional)
  - `hosts/wasmtime/*`
  - `hosts/embedded/*`
- Specs:
  - `docs/host_interface.md`
  - `docs/profiles.md`
  - `docs/security.md`
- Tests:
  - `tests/conformance/*`
  - `tests/properties/*`

---

## 10. Notes / Non-goals (v1)
- No JIT or native codegen
- No unconstrained OS access
- No “spawn process” effect by default
- No dynamic linking

---

### Appendix A: Suggested error codes
- `E_OK`
- `E_DECODE`
- `E_LIMIT`
- `E_CAPABILITY`
- `E_IO`
- `E_NET`
- `E_FS`
- `E_INTERNAL`

### Appendix B: Example `iris_run` I/O
- Program: UTF-8 IRIS source bytes
- Input: CBOR (optional), e.g. `{"args":["--foo"],"stdin":"..."}` 
- Output: CBOR, e.g. `{"stdout":"...","result":{...},"metrics":{"steps":123}}`
