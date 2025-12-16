# IRIS v0.4 Programming Language

Welcome to the documentation for **IRIS**, a minimal, deterministic, AI-centric programming language.

## 🚀 Getting Started

### 1. Download

Download the latest binary for your operating system from the **[Releases Page](https://github.com/ljack/iris-v0/releases/latest)**.

- **macOS**: `iris-v0-macos`
- **Linux**: `iris-v0-linux`
- **Windows**: `iris-v0-win.exe`

### 2. Install

**Linux / macOS:**
```bash
# Make executable
chmod +x iris-v0-macos  # or linux

# Move to path (optional)
mv iris-v0-macos /usr/local/bin/iris
```

**Windows:**
Add the downloaded `.exe` to your PATH or run it from PowerShell.

### 3. Verify

```bash
iris version
# Output: IRIS v0.4.0
```

---

## 💡 Examples

### Hello World

Create a file named `hello.iris`:

```lisp
(program
  (module (name "hello") (version 0))
  (defs
    (deffn (name main) (args) (ret I64) (eff !IO)
      (body 
        (let (res (io.print "Hello, world!"))
        0)
      )
    )
  )
)
```

**Run it:**
```bash
iris run hello.iris
```

### Fibonacci Sequence

Create `fib.iris`:

```lisp
(program
  (module (name "fib") (version 0))
  (defs
    (deffn (name fib) (args (n I64)) (ret I64) (eff !Pure)
      (body
        (if (< n 2)
            n
            (+ (call fib (- n 1)) (call fib (- n 2))))
      )
    )
    (deffn (name main) (args) (ret I64) (eff !IO)
      (body
        (let (x (call fib 10))
        (let (_ (io.print x))
        0))
      )
    )
  )
)
```

**Run it:**
```bash
iris run fib.iris
```

### HTTP Server

Create `server.iris`:

```lisp
(program
  (module (name "server") (version 0))
  (imports (import "http"))
  (defs
    ;; Define handle_client function...
    ;; (See full example in examples/server.iris in the repo)
    
    (deffn (name main) (args) (ret I64) (eff !Net)
      (body
        (let (port 8080)
        (let (server (net.listen port))
        (let (_ (io.print "Listening on port 8080..."))
        (call loop server))))
      )
    )
    ;; ... loop definition ...
  )
)
```

**Run it:**
```bash
iris run server.iris
```
*Note: This server listens on port 8080. Open http://localhost:8080 in your browser.*

---

## 📚 Documentation
- **[Specification (v0.4)](https://github.com/ljack/iris-v0/blob/master/IRIS-v0.4.md)**
- **[GitHub Repository](https://github.com/ljack/iris-v0)**
