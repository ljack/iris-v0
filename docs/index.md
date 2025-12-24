# IRIS v0.4 Programming Language

Welcome to the documentation for **IRIS**, a minimal, deterministic, AI-centric programming language.

## 🌟 [Try the Online Playground](playground.html) 🌟

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
        (let (res (io.print "Hello, world!")) 0)
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
            (+ (fib (- n 1)) (fib (- n 2))))
      )
    )
    
    (deffn (name main) (args) (ret I64) (eff !IO)
      (body 
        (let (res (io.print "Calculating fib(10)..."))
             (let (val (fib 10))
                  (let (res2 (io.print val))
                       val)))
      )
    )
  )
)
```

**Run it:**
```bash
iris run fib.iris
```

### Dot Access Sugar

Iris supports dot access for record fields and tuple indexes. This is shorthand for `record.get` and `tuple.get`.

```lisp
;; These are equivalent:
(record.get user "name")
user.name

;; Tuple access by index:
(tuple.get pair 1)
pair.1
```

### HTTP Server (Minimal)

Create `server.iris`:

```lisp
(program
  (module (name "server") (version 0))
  (imports (import "http"))
  (defs
    (deffn (name handle_client) (args (sock I64)) (ret I64) (eff !Net)
      (body
        (match (net.read sock)
           (case (tag "Ok" (raw_req))
              (let (response "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nHello from IRIS!")
                 (let (_ (net.write sock response)) 
                    (match (net.close sock) 
                       (case (tag "Ok" (ok)) 0) 
                       (case (tag "Err" (e)) 1))
                 )
              )
           )
           (case (tag "Err" (e)) (let (_ (net.close sock)) 1))
        )
      )
    )

    (deffn (name loop) (args (server_sock I64)) (ret I64) (eff !Net)
      (body
         (match (net.accept server_sock)
            (case (tag "Ok" (client_sock))
               (let (_ (handle_client client_sock))
                   (loop server_sock))
            )
            (case (tag "Err" (e)) (loop server_sock))
         )
      )
    )

    (deffn (name main) (args) (ret I64) (eff !Net)
       (body
          (match (net.listen 8080)
             (case (tag "Ok" (server_sock))
                (let (_ (io.print "Listening on http://localhost:8080"))
                    (loop server_sock)
                )
             )
             (case (tag "Err" (e)) (io.print "Failed to listen"))
          )
       )
    )
  )
)
```

**Run it:**
```bash
iris run server.iris
```
*Note: This server listens on port 8080. Open http://localhost:8080 in your browser.*

---

## 🧰 Tool Host (Optional)

IRIS can call host-provided tools (handy for LLM agents and integrations). In the browser playground, set `window.irisTools` to expose functions.

```lisp
(program
  (module (name "tools") (version 0))
  (defs
    (deftool (name add) (args (a I64) (b I64)) (ret I64) (eff !IO)
      (doc "Adds two numbers"))
    (deffn (name main) (args) (ret I64) (eff !IO)
      (body (add 2 5))
    )
  )
)
```

---

## 📚 Documentation
- **[Specification (v0.4)](https://github.com/ljack/iris-v0/blob/master/IRIS-v0.4.md)**
- **[GitHub Repository](https://github.com/ljack/iris-v0)**

<script>
document.querySelectorAll('pre').forEach(pre => {
  const button = document.createElement('button');
  button.innerText = 'Copy';
  button.style.position = 'absolute';
  button.style.right = '10px';
  button.style.top = '10px';
  button.style.zIndex = '10';
  button.style.padding = '5px 10px';
  button.style.background = '#444';
  button.style.color = '#fff';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.borderRadius = '4px';

  // Ensure pre is relative position for verify button placement
  pre.style.position = 'relative';

  button.addEventListener('click', () => {
    const code = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
    navigator.clipboard.writeText(code);
    button.innerText = 'Copied!';
    setTimeout(() => button.innerText = 'Copy', 2000);
  });
  pre.appendChild(button);
});
</script>
