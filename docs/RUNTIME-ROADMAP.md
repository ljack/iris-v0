# Runtime Roadmap (Multi-Backend)

## Goals
- One IRIS runtime core with pluggable hosts for tools, filesystem, and network.
- Consistent semantics across Node, browser, WASM, mobile, and embedded targets.
- Keep LLM-friendly surface area: explicit effects, typed tools, predictable errors.

## Target Backends
- **Node.js**: full capabilities (FS, Net, Tools, Process).
- **Browser**: in-memory FS, limited Net (mock or fetch-based), tools via `window.irisTools`.
- **WASM (hosted)**: portable core with host-provided imports; works in browser and server.
- **Embedded/IoT**: minimal host subset; tools and FS likely stubbed or serialized.

## Core Host Abstractions
Define a small host API surface shared by all backends:
- `IFileSystem`: read/write/exists/readDir
- `INetwork`: listen/accept/read/write/close/connect
- `IToolHost`: `callTool`/`callToolSync`
Roadmap preference: keep these interfaces stable and versioned.

## Phases
### Phase 1: Baseline Parity
- Ensure Node and Browser runtime behavior match for core intrinsics.
- Document differences (e.g., browser net stubs) in `docs/PROJECT_STATUS.md`.
- Add smoke tests to cover tool/FS/Net adapter behavior.

### Phase 2: WASM-Ready Runtime
- Define import ABI for FS/Net/Tools (names, signatures, error model).
- Provide a minimal WASM host shim in TS (browser + Node).
- Add sample `runWasm` entrypoint and tests for tool calls.

### Phase 3: Extended Targets
- Mobile: thin host wrapper over platform storage and networking.
- Serverless: map tools to environment or injected handlers.
- IoT: define a "tiny host" profile with strict caps.

## Milestones (Suggested Order)
1. Document host API and capability matrix.
2. Add WASM host ABI doc + TypeScript reference shim.
3. Provide browser runtime entrypoint for tool-hosted apps.
4. Add regression tests for tool metadata and host behavior.

## Open Questions
- Error model: should host errors map to `Result` or `RuntimeError`?
- Capability enforcement: compile-time only or runtime checks in host?
- Net in browser: keep mock or add fetch-based limited network?

## Definition of Done
- All backends share the same tool/FS/Net contracts.
- Tests pass with coverage near 99%.
- Web playground and CLI both support `deftool` examples.
