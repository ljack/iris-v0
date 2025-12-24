# IRIS v0 - AI-Centric Deterministic Programming Language

[![Tests Passing](https://img.shields.io/badge/tests-passing-brightgreen)](./tests/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-green)](#license)

IRIS is a minimal, deterministic programming language designed for AI systems that need machine-verifiable contracts, explicit side-effect tracking, and reproducible execution. It prioritizes safety and clarity over convenience.

## Features

### 🎯 Core Language
- **S-Expression Syntax**: Unambiguous parsing with no whitespace sensitivity
- **Strong Type System**: Full compile-time type checking with effect tracking
- **Explicit Effects**: No hidden I/O - all side effects are explicitly declared
- **Immutability by Default**: Functional programming paradigm
- **Pattern Matching**: Exhaustive match expressions for safe control flow

### ⚡ Effect System
- **Effect Lattice**: `!Pure < !IO < !Net < !Any` with proper subtyping
- **Automatic Inference**: `!Infer` annotation for automatic effect computation
- **Effect Propagation**: Effects correctly propagate through call chains
- **Effect Constraints**: Functions declare effect requirements explicitly

### 🔒 Safety Features
- **Type Safety**: All operations type-checked at compile time
- **No Null/Undefined**: Use `Option<T>` and `Result<T, E>` for safe error handling
- **Deterministic**: 100% reproducible execution (no randomness, no concurrency hazards)
- **Canonical Output**: Sorted record fields ensure consistent results
- **Static Dispatch**: No dynamic dispatch, easy to reason about

### 📦 Built-in Types
```iris
Primitives:    I64, Bool, Str
Collections:   List<T>, Tuple, Record, Option<T>, Result<T, E>
Functions:     Fn (first-class functions)
```

### 🛠 Standard Operations
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Comparison**: `<`, `<=`, `=`
- **Collections**: `List`, `Tuple`, `Record`
- **Option/Result**: `Some`, `None`, `Ok`, `Err`
- **I/O**: `io.read_file`, `io.write_file`, `io.print`
- **Functions**: User-defined with static dispatch

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/ljack/iris-v0.git
cd iris-v0

# Install dependencies
npm install

# Run tests
npm test
```

## Iris Guardrails

Install the pre-commit hook to catch missing parentheses in staged `.iris` files:

```bash
scripts/install-iris-hooks.sh
```

This runs `./bin/iris check` on staged `.iris` files and blocks commits on parse errors.

### Hello World

```iris
(program
 (module (name "hello") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body "Hello, IRIS!"))))
```

### Working with Effects

```iris
(program
 (module (name "example") (version 0))
 (defs
  (deffn (name read_and_process)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body
      (io.read_file "/data/input.txt")))

  (deffn (name pure_computation)
    (args (x I64))
    (ret I64)
    (eff !Pure)
    (body (+ x 1)))

  (deffn (name main)
    (args)
    (ret I64)
    (eff !IO)
    (body (pure_computation 42)))))
```

### Pattern Matching

```iris
(match (Some 42)
  (case (tag "Some" (x)) (+ x 1))
  (case (tag "None") 0))

(match (Ok "success")
  (case (tag "Ok" (v)) v)
  (case (tag "Err" (e)) "error"))
```

### Dot Access (Sugar)

```iris
;; Desugars to record.get / tuple.get
(let (user (record (name "Ada") (age 37)))
  (user.name))

(let (pair (tuple 1 2))
  (pair.0))
```

## Project Structure

```
iris-v0/
├── src/                    # Core implementation (1,108 lines)
│   ├── main.ts            # Entry point - orchestrates pipeline
│   ├── sexp.ts            # S-expression parser & printer
│   ├── typecheck.ts       # Type checker with effect inference
│   ├── eval.ts            # Interpreter/evaluator
│   ├── types.ts           # Type system definitions
│   ├── tests.ts           # Test runner harness
│   └── test-types.ts      # Test type definitions
│
├── tests/                 # Comprehensive test suite
│   ├── t01-t10.ts        # Tier 1: Core features
│   ├── t11-t20.ts        # Tier 2: Advanced features
│   ├── t21-t30.ts        # Tier 3a: Effect lattice
│   └── t31+.ts           # Tier 3b: Adversarial/edge cases
│
├── specs/                # Specification documents
│   ├── iris-v0.1.md      # Core language specification
│   ├── iris-v0.2.md      # Effect lattice & inference
│   └── iris-v0.3.md      # Testing & quality guidelines
│
├── goals/                # Strategic goals
│   ├── goal-4.md         # HTTP server objective
│   └── GOAL-4-ROADMAP.md # Goal 4 detailed roadmap
│
├── docs/                   # Documentation and Roadmap
├── examples/             # Example programs and fixtures
│   ├── real/             # Real Iris sources for demos/tooling
│   │   ├── apps/         # Runnable apps (hello, fib, http server)
│   │   └── compiler/     # Iris compiler pipeline modules
│   ├── tests/            # Test fixtures for LSP/compiler
│   └── sandbox/          # Scratchpad files
├── package.json         # NPM configuration
└── tsconfig.json        # TypeScript configuration
```

## Contributor Guide

- See `AGENTS.md` for repo-specific contributor guidelines.

## Zed Extension

The Zed editor extension is maintained in a separate repo. Local path:

```
/Users/jarkko/_dev/iris-zed
```

This repo no longer tracks the `zed/` directory or the `tree-sitter-iris` grammar (now housed in `iris-zed`).

## Architecture

### Pipeline
```
Source Code
    ↓
Parser (sexp.ts)
    ↓ AST
Type Checker (typecheck.ts)
    ↓ Validated AST
Evaluator (eval.ts)
    ↓ Value
Printer (sexp.ts)
    ↓
Output
```

### Key Components

**Parser (sexp.ts - 481 lines)**
- Tokenizer: Parentheses, symbols, integers, strings, booleans
- Recursive descent parser
- Canonical printer with sorted record fields

**Type Checker (typecheck.ts - 302 lines)**
- Two-pass checking (signature collection, validation)
- Effect inference with lattice semantics
- Support for `!Infer` automatic inference
- Full type unification

**Evaluator (eval.ts - 171 lines)**
- Expression evaluation with environment management
- Pattern matching for Option/Result
- Intrinsic operations
- File system simulation

## Testing

All tests pass in CI:

```bash
npm test
```

### Test Tiers

| Tier | Range | Focus |
|------|-------|-------|
| Tier 1 | T01-T10 | Core features (literals, arithmetic, control flow) |
| Tier 2 | T11-T20 | Advanced features (records, Results, fuel limits) |
| Tier 3a | T21-T30 | Effect lattice and inference |
| Tier 3b | T31+ | Adversarial and edge cases |

## Language Specification

### Syntax

```iris
Program ::= (program Module Defs)
Module  ::= (module (name Str) (version Int))
Defs    ::= (defs Definition*)
Definition ::= (deffn (name Symbol) (args Args) (ret Type) (eff Effect) (body Expr))

Expr    ::= Literal | Variable | (let (Symbol Expr) Expr) | (if Expr Expr Expr)
          | (match Expr Case*) | (Symbol Expr*) | (record Field*) | Intrinsic

Type    ::= I64 | Bool | Str | (Option Type) | (Result Type Type)
          | (List Type) | (Record Field*) | (Tuple Type*) | (Fn Args Type)

Effect  ::= !Pure | !IO | !Net | !Any | !Infer
```

### Effect System

```
!Pure       Pure computation (no side effects)
!IO         File system and console I/O
!Net        Network I/O
!Any        Any effect (top of lattice)
!Infer      Automatic effect inference

Subtyping:  !Pure < !IO < !Net < !Any
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with watch mode
npm run test:watch

# Check TypeScript
npx tsc --noEmit
```

### Iris tests

- Place `.iris` test programs under `tests/iris/` (e.g., `t800_example.iris`).
- Import `test/assert` to access `assert-eq`, `assert-true`, and `assert-error`, and have `main` return a list of assertion records.
- `npm test` will run the Iris suite alongside existing TypeScript cases.

### Running Examples

```bash
# Run a program
npx ts-node src/main.ts < program.iris

# Run with custom filesystem
npx ts-node -e "const {run} = require('./src/main'); console.log(run(source, fs))"
```

## Roadmap

See [WHATS-NEXT.md](./docs/WHATS-NEXT.md) for comprehensive project roadmap including:

- **Phase 1**: Foundation (error messages, REPL, string operations)
- **Phase 2**: Professional tools (formatter, LSP, syntax highlighting)
- **Phase 3**: Performance (TCO, optimization, benchmarks)
- **Phase 4**: Advanced features (modules, async, custom effects)
- **Phase 5**: Verification (property testing, formal verification)

### Current Goals

- **Goal 4**: HTTP server implementation - See [GOAL-4-ROADMAP.md](./goals/GOAL-4-ROADMAP.md)

## Performance

Current implementation prioritizes correctness and clarity over performance. Planned optimizations include:

- Tail-call optimization (TCO)
- Pure function memoization
- Pattern matching compilation
- Bytecode compiler

## Documentation

- **[Language Specification](./docs/iris-v0-specification.md)** - Complete language design
- **[Effect System](./specs/iris-v0.2.md)** - Effect lattice and inference rules
- **[Implementation Guide](./docs/IMPLEMENTATION.md)** - For contributors
- **[API Reference](./docs/API.md)** - Standard library reference

## Examples

### Pure Function Example

```iris
(program
 (module (name "math") (version 0))
 (defs
  (deffn (name factorial)
    (args (n I64))
    (ret I64)
    (eff !Pure)
    (body
      (if (<= n 1)
        1
        (* n (factorial (- n 1))))))

  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (factorial 5)))))
```

### I/O with Error Handling

```iris
(program
 (module (name "fileops") (version 0))
 (defs
  (deffn (name process_file)
    (args (filename Str))
    (ret (Result Str Str))
    (eff !IO)
    (body
      (match (io.read_file filename)
        (case (tag "Ok" (content)) (Ok content))
        (case (tag "Err" (e)) (Err e)))))

  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (process_file "data.txt")))))
```

### Pattern Matching

```iris
(program
 (module (name "matching") (version 0))
 (defs
  (deffn (name process_option)
    (args (opt (Option I64)))
    (ret Str)
    (eff !Pure)
    (body
      (match opt
        (case (tag "Some" (x)) "Got a value")
        (case (tag "None") "No value"))))

  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body (process_option (Some 42))))))
```

## Philosophy

IRIS is designed around these principles:

1. **Determinism**: Same input always produces same output
2. **Explicitness**: Effects are never hidden
3. **Safety**: Compile-time guarantees about behavior
4. **Clarity**: Code is easy to reason about
5. **Simplicity**: Minimal feature set, maximum clarity

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Type Checking | O(n) | Single-pass over AST |
| Evaluation | O(n) | Depends on recursion depth |
| Pattern Matching | O(n) | Linear in number of cases |
| Record Operations | O(1) | Field access is constant-time |

Note: Current implementation prioritizes correctness. Performance optimizations are planned.

## Limitations

- Single-threaded execution (async planned)
- No generics yet (planned for v0.5)
- No custom types (records only)
- No standard library modules yet (planned with module system)
- Limited intrinsic functions (expanding)

## Related Work

IRIS draws inspiration from:

- **Rust**: Ownership system and effect handling concepts
- **Haskell**: Pure functions and effect monad concepts
- **Lisp**: S-expression syntax and homoiconicity
- **Lua**: Simplicity and embeddability

See [INSPIRATIONS.md](./docs/INSPIRATIONS.md) for detailed comparison.

## FAQ

**Q: Why S-expressions?**
A: They eliminate parsing ambiguity and provide homoiconicity (code as data), making programs easier for AI systems to analyze and transform.

**Q: Why require explicit effects?**
A: Hidden side effects are the source of many bugs. Making effects explicit makes behavior obvious and enables better optimization.

**Q: Can I use IRIS in production?**
A: IRIS v0 is suitable for deterministic computation tasks where clarity and correctness matter more than raw performance. For performance-critical code, optimizations in Phase 3 of the roadmap will help.

**Q: How do I report bugs?**
A: Please file an issue on GitHub with a minimal reproduction case.

**Q: Can I extend IRIS?**
A: IRIS is designed to be minimal and focused. For custom extensions, consider forking the project or using it as a substrate for your own language.

## License

IRIS v0 is dual-licensed under either of:

- **MIT License** ([LICENSE-MIT](./LICENSE-MIT))
- **Apache License 2.0** ([LICENSE-APACHE](./LICENSE-APACHE))

at your option.

### Choose Your License

**MIT** if you want:
- Simplicity and minimal legal overhead
- Ultra-permissive terms
- Maximum compatibility

**Apache 2.0** if you want:
- Explicit patent protection
- Professional liability disclaimers
- Enterprise-grade clarity

Both licenses:
- ✅ **Commercial Use**: Allowed
- ✅ **Distribution**: Allowed
- ✅ **Modification**: Allowed
- ✅ **Private Use**: Allowed
- ✅ **Proprietary Derivatives**: Allowed

### Why Dual Licensing?

Like Rust, IRIS uses dual licensing to:

1. **Support All Use Cases**: MIT for simplicity, Apache for patent protection
2. **Maximize Adoption**: Works with any open source or proprietary project
3. **Community-Friendly**: No license conflicts or incompatibilities
4. **Professional**: Industry-standard approach used by major projects
5. **Flexible**: Users choose the license that works for them

For detailed license comparison, see [LICENSE](./LICENSE) and [docs/LICENSE-COMPARISON.md](./docs/LICENSE-COMPARISON.md).

## Community

- **Issues**: [GitHub Issues](https://github.com/ljack/iris-v0/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ljack/iris-v0/discussions)
- **Email**: iris-dev@example.com

## Authors

IRIS v0 was created by the IRIS Development Team with contributions from the community.

See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for full contributor list.

## Acknowledgments

- Thanks to the Rust, Haskell, and Lisp communities for inspiration
- Thanks to all contributors and testers
- Special thanks to early adopters and feedback providers

## Changelog

### v0.3 (Current)
- Comprehensive test suite (all passing)
- Complete effect lattice system
- Adversarial test suite (T31+)
- Module system planning (Goal 4)

### v0.2
- Effect system implementation
- Effect inference (Tests 21-30)
- Record and Result support

### v0.1
- Core language foundation
- Basic type system
- Parser and evaluator

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## Citation

If you use IRIS in academic work, please cite:

```bibtex
@software{iris_v0,
  title = {IRIS v0: AI-Centric Deterministic Programming Language},
  author = {IRIS Development Team},
  year = {2025},
  url = {https://github.com/ljack/iris-v0}
}
```

## Resources

- 📚 [Language Specification](./docs/iris-v0-specification.md)
- 🛣️ [Project Roadmap](./docs/WHATS-NEXT.md)
- 🎯 [Goal 4 Roadmap](./goals/GOAL-4-ROADMAP.md)
- 🧪 [Test Suite](./tests/)
- 📖 [Documentation](./docs/)
- 🔗 [GitHub Repository](https://github.com/ljack/iris-v0)

---

**Project Status**: Active Development ✨
**Latest Version**: 0.3
**Last Updated**: 2025-12-15
