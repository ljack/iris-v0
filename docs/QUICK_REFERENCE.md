# IRIS v0 - Quick Reference & Status Checklist

## What Works Right Now (✅ = Verified Working)

### CLI Commands
```bash
✅ iris run examples/real/apps/hello_full.iris       # Executes program
✅ iris check examples/real/apps/hello_full.iris     # Type-check only
✅ iris version                       # Shows v0.4.0
✅ iris help                          # Shows usage
❌ iris eval "code"                   # Not implemented
```

### Example Programs (All Runnable)
```bash
✅ iris run examples/real/apps/hello_full.iris       # Output: "Hello, world!" + 0
✅ iris run examples/real/apps/fib.iris         # Output: "Calculating fib(10)..." + 55
✅ iris run examples/real/apps/http_server.iris      # Output: "Listening on http://localhost:8080"
```

### Network Features (All 5 Implemented)
```
✅ net.listen(port: I64) -> Result<I64, Str>
✅ net.accept(handle: I64) -> Result<I64, Str>
✅ net.read(handle: I64) -> Result<Str, Str>
✅ net.write(handle: I64, data: Str) -> Result<I64, Str>
✅ net.close(handle: I64) -> Result<Bool, Str>
```

### HTTP Server
```
✅ Binds to port 8080
✅ Accepts incoming connections
✅ Reads HTTP requests
✅ Parses requests with http.parse_request
✅ Serves static files with io.read_file
✅ Sends HTTP responses
✅ Handles path safety (prevents ..)
✅ Generates 200/404/403 responses
❌ Concurrent requests (single-threaded)
❌ HTTPS/SSL (not implemented)
```

### Built-in Intrinsics (24 total)

**Arithmetic** (5):
```
+ - * / (arithmetic)
< <= = (comparison)
```

**I/O** (5):
```
io.read_file, io.write_file, io.file_exists, 
io.read_dir, io.print
```

**Network** (5):
```
net.listen, net.accept, net.read, net.write, net.close
```

**HTTP** (1):
```
http.parse_request
```

**Strings** (3):
```
str.concat, str.contains, str.ends_with
```

**Value Constructors** (5):
```
Some, None, Ok, Err, List
```

## Test Status: 96/96 Passing

| Tests | Status | Details |
|-------|--------|---------|
| T01-T10 | ✅ | Basic types & literals |
| T11-T20 | ✅ | Functions & calls |
| T21-T30 | ✅ | Records |
| T31-T40 | ✅ | Pattern matching |
| T41-T70 | ✅ | Adversarial/edge cases |
| T71-T80 | ✅ | Let & if-then-else |
| T81 | ✅ | File I/O |
| T82 | ✅ | Bare None enforcement |
| T90 | ✅ | Module imports |
| T100+ | ✅ | Advanced scenarios |

## Core Features

### Language
- ✅ S-expression syntax
- ✅ Strong static typing
- ✅ Pattern matching (Option, Result, List)
- ✅ Module system with imports
- ✅ Effect tracking (!Pure, !IO, !Net, !Any)
- ✅ Records with field access
- ✅ Function definitions
- ✅ Tool definitions (deftool)
- ✅ Let-bindings
- ✅ If-then-else

### Type System
- ✅ I64, Bool, Str primitives
- ✅ List<T>, Tuple, Record collections
- ✅ Option<T>, Result<T, E>
- ✅ Function types with effects
- ✅ Type inference in patterns

### Effect System
- ✅ Lattice: !Pure < !IO < !Net < !Any
- ✅ !Infer for automatic computation
- ✅ Effect constraints on functions
- ✅ Proper propagation through calls

### Tools & Metadata
```
(deftool (name add) (args (a I64) (b I64)) (ret I64) (eff !IO)
  (doc "Adds two numbers")
  (requires "a and b fit in I64")
  (ensures "returns a + b")
  (caps (FS READ) (NET CONNECT)))
```

## File Structure

```
iris-v0/
├── bin/iris                 # Executable entry point
├── src/
│   ├── cli.ts              # CLI handler (308 lines)
│   ├── eval.ts             # Interpreter (447 lines)
│   ├── main.ts             # Orchestration (161 lines)
│   ├── typecheck.ts        # Type checking (450+ lines)
│   ├── sexp.ts             # S-expr parser (500+ lines)
│   └── types.ts            # TypeScript types
├── examples/
│   ├── real/
│   │   ├── apps/
│   │   │   ├── hello_full.iris  # Hello world
│   │   │   ├── fib.iris         # Fibonacci
│   │   │   └── http_server.iris # HTTP server
│   │   └── compiler/            # Iris compiler modules
│   ├── tests/                   # LSP/compiler fixtures
│   └── sandbox/                 # Scratchpad files
├── tests/
│   ├── t01.ts through t82.ts   # 82 tests
│   ├── t90.ts              # Module test
│   ├── t100+ through t113.ts   # Advanced tests
│   └── test_server.ts      # Integration test
└── dist/                   # Compiled JavaScript (from npm run build)
```

## Version Info

- **Package**: 0.5.0 (in development)
- **CLI Shows**: v0.4.0 (stable release)
- **Latest Commit**: 2ddc180 - Init v0.5.0-dev

## Commands to Know

```bash
# Build
npm run build              # Compile TypeScript

# Testing
npm run test               # Run 96 tests
npm run test-cli           # CLI tests only

# Using IRIS
./bin/iris run file.iris   # Execute
./bin/iris check file.iris # Type-check
./bin/iris version         # Show version
./bin/iris help            # Show help
```

## Key Implementation Files

| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| src/cli.ts | CLI & NodeNetwork | NodeNetwork, cli() |
| src/eval.ts | Interpreter | Interpreter, evalIntrinsic() |
| src/main.ts | Orchestration | run(), check() |
| src/typecheck.ts | Type checker | TypeChecker.check() |
| src/sexp.ts | Parser | Parser.parse() |

## Known Limitations

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| Single-threaded | Can't handle concurrent requests | Design for single request |
| No HTTPS | Only HTTP available | Use HTTP for now |
| No async/await | Sequential execution | Design linearly |
| No REPL | Must use files | Use iris run with file |
| Browser incomplete | Can't run in browser | Use Node.js for now |

## What's Next (Planned)

### Short term (v0.5)
- [ ] Browser/WebAssembly support (in progress)
- [ ] Performance optimizations
- [ ] Better error messages with locations

### Medium term (v0.6+)
- [ ] Async/await and concurrency
- [ ] HTTPS/SSL support
- [ ] HTTP framework utilities
- [ ] Standard library modules

### Long term
- [ ] REPL mode
- [ ] Package manager
- [ ] Debugging support
- [ ] Documentation & tutorials

## Quick Start Example

```iris
(program
  (module (name "example") (version 0))
  (defs
    (deffn (name greet)
      (args (name Str))
      (ret Str)
      (eff !Pure)
      (body (str.concat "Hello, " name)))
    
    (deffn (name main)
      (args)
      (ret I64)
      (eff !IO)
      (body
        (let (msg (call greet "IRIS"))
             (let (_ (io.print msg))
                  0))))))
```

Save as `greet.iris`, then:
```bash
$ iris run greet.iris
Hello, IRIS
0
```

## HTTP Server Example (Simplified)

The `examples/real/apps/http_server.iris` demonstrates:
1. `net.listen 8080` - Bind to port
2. `net.accept server_sock` - Accept connections in loop
3. `net.read client_sock` - Read HTTP request
4. `http.parse_request raw` - Parse request
5. `io.read_file path` - Get file content
6. `net.write client_sock response` - Send HTTP response
7. `net.close sock` - Close connection

Full example serves files from `examples/real/apps/` directory on localhost:8080.

## Debugging Tips

```bash
# Type-check to find errors before running
iris check myprogram.iris

# Check what tests pass
npm run test

# Run specific example
iris run examples/real/apps/hello_full.iris

# Build if you modify source
npm run build
```

## Contact & Resources

- **GitHub**: https://github.com/ljack/iris-v0
- **Status**: Stable (v0.4), In Development (v0.5)
- **License**: MIT OR Apache-2.0

---

Last Updated: December 16, 2025
Report: PROJECT_STATUS.md (comprehensive)
