```md
# Goals: Zed-inspired WASM + Tool Boundary for IRIS

## Scope map
- This doc owns **tool/host boundary principles** (capabilities, versioning, determinism).
- Compiler backend evolution lives in `goals/goal-17-iris2wasm-backend-evolution.md`.
- Runtime/ABI + platform profiles live in `goals/goal-iris_wasm_host_plan.md`.

This document captures a set of goals and design principles for evolving IRIS using ideas borrowed from how Zed uses WebAssembly (WASM) for extensions: **sandbox the control plane, keep effects explicit, and keep interfaces versioned and capability-based**.

The intent is to use this as a north star when designing:
- IRIS tool-host integration
- IRIS-to-WASM execution (playground + sandboxed runtimes)
- IRIS compiler/codegen structure (especially WAT generation)
- Future plugin/extension mechanisms

---

## Why this exists

IRIS aims to be:
- **minimal**
- **deterministic by default**
- **AI-centric**
- **tool-hostable** (effects mediated via explicit host tools)

Zed demonstrates a pragmatic architecture for these goals:
- run **extension logic** in a sandbox (WASM)
- let heavy work happen in **external processes**
- keep the host boundary **explicit**, **capability-based**, and **versioned**

IRIS can reuse these architectural lessons without copying Zed’s exact implementation.

---

## Key lessons to apply to IRIS

### 1) Sandbox the control plane, not the effects
- Run IRIS (or IRIS “plugins”) in WASM where possible to isolate failures and remove ambient authority.
- Allow heavy work (compilers, formatters, LSP servers, code generators) to run as **sidecar processes** when needed.
- Treat those sidecars as **tools** with explicit interfaces.

**Rule of thumb:**  
IRIS decides *what should happen*; the host performs effects explicitly via tools.

### 2) Capability-based tool access
- IRIS code should not assume arbitrary host powers.
- The host should grant tools explicitly (by name + version + schema).
- IRIS should support a way to declare required tools/capabilities.

This matches IRIS’s effect mindset and improves safety, portability, and reproducibility.

### 3) Versioned contracts
- Every boundary should have versions:
  - Tool interfaces
  - Host API surface
  - IRIS-to-WASM import/export interface
- Programs should declare minimum compatible host/tool versions.
- Breaking changes must be surfaced early and clearly.
- **Current host ABI tag:** `iris-host-abi/0.1.0` (aligns with capability/profile matrix in `goal-iris_wasm_host_plan.md`).

### 4) Separate structure from representation (especially codegen)
- Stop building structured targets (like WAT) via deep string concatenation.
- Prefer building a structured intermediate form (even if tiny), rendering to text only at the edge.
- Adopt small helpers/builders for WAT S-expressions to eliminate paren soup.

This is directly motivated by the current pain in `codegen_wasm_expr.iris`.

### 5) Determinism by default
- IRIS core evaluation should remain deterministic given the same inputs.
- Any non-determinism (time, randomness, network, LLM calls) must be explicit and host-mediated.
- WASM is a deployment option that helps enforce this discipline, but determinism is a language/host contract, not a target.

---

## Near-term goals

### G1) Improve WAT generation maintainability
**Problem:** WAT parentheses inside string literals make manual editing brittle and confuse tooling.

**Goal:** Introduce minimal structured builders for WAT S-expressions and refactor incrementally.

Concrete actions:
- Add minimal WAT builder helpers (in `wasm_syntax` or a new `wasm_emit` module):
  - `ws.s(head, argsList)` → one-line S-expr
  - `ws.b(head, linesList)` → multi-line block S-expr
  - `ws.lines(list)` / `ws.join_with(sep, list)`
  - optional indentation helper if string utilities exist
- Refactor the compiler’s wasm generator one function per commit.
- Add golden tests for generated output to keep semantics stable.

Success criteria:
- Major functions (`gen_match_cases`, intrinsic `list.get`, `cons`) become readable without paren balancing.
- Changes become low-risk due to tests.

### G2) Tighten the Tool Host concept
**Goal:** Tools are explicit, declarative, and versioned.

Concrete actions:
- Define a tool interface schema (inputs/outputs, effect mapping).
- Add a “required tools” declaration for programs (or for environments).
- Consider a small manifest format for runtimes that supply tools.

Success criteria:
- An IRIS program can state which tools it needs.
- Hosts can refuse or sandbox tools consistently.

### G3) Define an IRIS ↔ host boundary suitable for WASM
**Goal:** IRIS can run in WASM (playground / sandbox runtimes) and call host tools through a stable interface.

Concrete actions:
- Specify a minimal host ABI for tools:
  - tool discovery
  - tool invocation
  - structured argument passing (e.g., IRIS values serialized)
  - error propagation
- Ensure the ABI supports deterministic replay (e.g., record tool calls / results optionally).

Success criteria:
- A WASM-hosted IRIS runtime can run non-effectful code purely and effectful code via explicit host calls.
- Interfaces are versioned and compatible.

---

## Mid-term goals

### G4) Sidecar process tools (Zed-style)
**Goal:** Some tools should be able to run as managed processes.

Examples:
- LSP servers
- formatters
- compilers / transpilers

Concrete actions:
- Define how a tool host can install/manage sidecars:
  - configuration
  - lifecycle
  - sandboxing (where possible)
  - stdio protocol conventions

Success criteria:
- IRIS tooling ecosystem can integrate native tools without embedding them into the core language.

### G5) Reproducible environments
**Goal:** Deterministic IRIS execution depends on reproducible tool environments.

Concrete actions:
- Add “tool versions + checksums” support.
- Allow lockfiles or manifests that pin tool dependencies.
- Make outputs stable across machines.

Success criteria:
- CI runs produce the same results as local runs, and tool resolution is predictable.

---

## Non-goals (for now)

- Building a full plugin marketplace/registry.
- Forcing everything into WASM.
- Designing a complex macro system primarily to enable codegen.
- Writing a general-purpose formatter for IRIS as part of the wasm generation fix.
- Copying Zed’s exact WIT/component model stack without proving it fits IRIS needs.

---

## Practical guiding rules

1) Prefer small, verifiable steps over big rewrites.  
2) Add tests before refactors when the output must remain stable.  
3) Put structure into data, not into strings.  
4) Every capability should be explicit.  
5) Every boundary should be versioned.

---

## Proposed next steps checklist

- [ ] Add minimal WAT builder helpers (`ws.s`, `ws.b`, `ws.lines`)
- [ ] Refactor `gen_match_cases` using builders + add a golden test
- [ ] Refactor the `list.get` intrinsic code path + add/extend tests
- [ ] Document a draft tool schema + versioning approach
- [ ] Draft a minimal IRIS↔host ABI suitable for WASM runtimes

---

## Notes

This document captures architectural goals, not a strict spec. When decisions conflict (e.g., minimalism vs. ergonomics), prefer:
- determinism
- explicit boundaries
- small composable primitives
- incremental evolution with tests
```
