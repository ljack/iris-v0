# IRIS WASM Profiles (WASI + Host ABI + Components)

## Goal
Document how IRIS can target WebAssembly for “runs everywhere” while keeping a stable host interface.

## Profile A: Custom Host ABI (current)
**Imports (examples):**
- `host.print(ptr: i64) -> i64`
- `host.tool_call_json(name_ptr: i64, args_ptr: i64) -> i64`
- `host.fs_read(path_ptr: i64) -> i64`

**String ABI:**
- `[len:i64][bytes...]` (UTF-8)

**Pros**
- Simple to implement in Node/Browser/CLI.
- Keeps IRIS runtime in control.

**Cons**
- Not a standard interface.
- Every runtime needs a host shim.

## Profile B: WASI + Host ABI (hybrid)
Use WASI for OS-like features, keep `host.*` for IRIS tools and domain APIs.

**WASI for:**
- stdout/stderr (print/log)
- file I/O
- args/env
- clocks/random

**Host ABI for:**
- tools, AI agents, special runtime extensions

**Pros**
- Portable across wasmtime/wasmer/wasm-edge/wazero.
- Less custom code for OS-level features.

**Cons**
- Mapping IRIS effects to WASI needs a clear policy.
- Requires WASI-capable runtime.

## Profile C: Component Model (WIT)
Define typed interfaces for IRIS hosts and tools.

**Example WIT (sketch):**
```
package iris:runtime;

interface host {
  print: func(text: string);
  tool-call: func(name: string, args: list<string>) -> result<string, string>;
}

world iris-app {
  import host;
  export main: func() -> s64;
}
```

**Pros**
- Typed and future-proof.
- Great for plugin ecosystems.

**Cons**
- Component runtimes still maturing.
- More build/setup complexity.

## Recommended Path
1. Keep **Profile A** (current) as the minimal stable baseline.
2. Add **Profile B** for standard WASI runtimes.
3. Prototype **Profile C** for future typed interoperability.

## Compiler/CLI Notes
- `compiler.iris` accepts targets like `wasm` (host ABI) and `wasm-wasi` (WASI profile).
- `bin/iris run-wasm` supports `--wasm-profile host|wasi`.
