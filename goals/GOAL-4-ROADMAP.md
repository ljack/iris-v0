# Goal 4: HTTP Server Implementation - Detailed Roadmap

**Objective**: Create an HTTP server that serves files from a directory using IRIS v0

**Target Example**:
```iris
(program
 (module (name "main") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Net)
    (body (http.start_server 8080)))))
```

**Success Criteria**:
- [x] HTTP server starts and listens on specified port
- [x] Server serves static files from configurable directory
- [x] Proper HTTP response headers
- [x] Error handling for missing files (404)
- [x] Example program demonstrates full functionality
- [x] All integration tests pass

---

## Phase 1: Foundation - Module System Implementation (CRITICAL PATH)

**Duration**: 2-3 weeks | **Priority**: CRITICAL | **Blockers**: None

### 1.1 Module Syntax & Parsing
- [ ] **Design Module Syntax**
  - Finalize module declaration: `(module (name "...") (version N))`
  - Finalize import syntax: `(import (module "...") (items (func1 func2)))`
  - Plan namespace resolution rules
  - **Spec Document**: Create `MODULE-SYSTEM-SPEC.md`

- [ ] **Parser Extensions**
  - Add module declaration parsing
  - Add import statement parsing
  - Add namespace-qualified function calls: `module.function`
  - Add qualified name resolution in type checker
  - **Tests**: 8-10 parser tests for module syntax

### 1.2 Module Resolution System
- [ ] **Module Loader**
  - Implement module file resolution (search paths)
  - Handle relative/absolute imports
  - Create module cache system
  - Handle circular import detection

- [ ] **Namespace Management**
  - Implement symbol table with modules
  - Handle name shadowing across modules
  - Implement qualified name lookup
  - Support re-exports

- [ ] **Error Handling**
  - Module not found errors
  - Circular import detection
  - Name collision warnings
  - **Tests**: 6-8 module resolution tests

### 1.3 Type Checking with Modules
- [ ] **Cross-Module Type Checking**
  - Resolve function types across modules
  - Check effect requirements across modules
  - Validate import/export contracts
  - **Tests**: 8-10 cross-module type tests

- [ ] **Effect System Integration**
  - Track effects across module boundaries
  - Validate effect requirements
  - Propagate `!Infer` across modules
  - **Tests**: 5-7 effect tests

### 1.4 Module Testing
- [ ] **Module Tests** (15-20 tests)
  - Basic module definition and import
  - Multiple module interaction
  - Qualified function calls
  - Namespace isolation
  - Re-exports
  - Circular import errors
  - Name shadowing
  - Effect propagation

---

## Phase 2: Network Effects & I/O Foundation

**Duration**: 1-2 weeks | **Priority**: CRITICAL | **Blocks**: HTTP module

### 2.1 `!Net` Effect Implementation
- [ ] **Effect Definition**
  - Define `!Net` effect for network operations
  - Update effect lattice: `!Pure < !IO < !Net < !Any`
  - Document effect ordering semantics
  - **Tests**: 4-6 `!Net` effect tests

- [ ] **Effect Inference Rules**
  - Implement `!Net` inference rules
  - Update effect subtyping rules
  - Handle `!Infer` with `!Net`
  - **Tests**: 5-7 effect inference tests

### 2.2 Advanced I/O Operations
- [ ] **File Operations Enhancement**
  - `io.read_file`: Already implemented ✓
  - `io.write_file`: New - write content to file
  - `io.delete_file`: New - delete file
  - `io.list_dir`: New - list directory contents
  - `io.file_exists`: New - check if file exists
  - `io.get_file_size`: New - get file size in bytes

- [ ] **I/O Error Handling**
  - File not found errors
  - Permission denied errors
  - File write failures
  - **Tests**: 8-10 I/O operation tests

### 2.3 Network I/O Foundation
- [ ] **Network Types**
  - Define `TcpListener` type
  - Define `TcpStream` type
  - Define `HttpRequest` type (parsing)
  - Define `HttpResponse` type (building)
  - Define `HttpError` type

- [ ] **Network Intrinsics**
  - `net.create_listener(port)`: Create TCP listener
  - `net.accept_connection(listener)`: Accept incoming connection
  - `net.read_bytes(stream, size)`: Read from stream
  - `net.write_bytes(stream, data)`: Write to stream
  - `net.close_stream(stream)`: Close connection

- [ ] **Network Tests** (10-12 tests)
  - Basic listener creation
  - Connection acceptance
  - Data reading/writing
  - Stream closure
  - Connection errors

---

## Phase 3: HTTP Module Implementation

**Duration**: 2-3 weeks | **Priority**: HIGH | **Blocks**: Example program

### 3.1 HTTP Parsing
- [ ] **HTTP Request Parser**
  - Parse HTTP request line (method, path, version)
  - Parse HTTP headers (key: value)
  - Parse request body
  - Handle different content-types
  - Error handling for malformed requests

- [ ] **HTTP Parser Tests** (10-12 tests)
  - Valid GET requests
  - Valid POST requests
  - Requests with headers
  - Requests with body
  - Malformed request error handling
  - Edge cases (empty lines, extra spaces)

### 3.2 HTTP Response Building
- [ ] **HTTP Response Builder**
  - Build status line (200, 404, 500, etc.)
  - Add response headers
  - Add response body
  - Handle MIME type detection
  - Proper header formatting

- [ ] **HTTP Response Tests** (8-10 tests)
  - Valid 200 responses
  - 404 not found responses
  - Responses with custom headers
  - Binary content (images, etc.)
  - Large responses

### 3.3 Core HTTP Module
- [ ] **HTTP Module Functions**
  - `http.start_server(port)`: Main entry point
    - Binds to port
    - Accepts connections
    - Processes requests in loop
    - Returns success/error

  - `http.create_request_handler()`: Closure for handling requests
    - Takes request as input
    - Returns response
    - Stateless (pure if possible)

  - `http.route_request(request, routes)`: Route dispatcher
    - Pattern match on path
    - Call appropriate handler
    - Return 404 if no match

  - `http.mime_type_for_file(filename)`: MIME type detection
    - `.html` -> `text/html`
    - `.css` -> `text/css`
    - `.js` -> `application/javascript`
    - `.json` -> `application/json`
    - `.txt` -> `text/plain`
    - `.png`, `.jpg`, `.gif` -> image types
    - Default: `application/octet-stream`

### 3.4 HTTP Module Tests (15-20 tests)
- [ ] Request parsing
- [ ] Response building
- [ ] Request routing
- [ ] MIME type detection
- [ ] Error handling
- [ ] Different HTTP methods (GET, POST, PUT, DELETE)
- [ ] Different status codes
- [ ] Header handling
- [ ] Large files
- [ ] Concurrent requests (if async implemented)

---

## Phase 4: File Serving Implementation

**Duration**: 1-2 weeks | **Priority**: HIGH | **Blocks**: Example program

### 4.1 Static File Server
- [ ] **File Serving Logic**
  - Resolve file paths safely (prevent directory traversal)
  - Read file content
  - Determine MIME type
  - Build HTTP response with file
  - Handle file not found (404)
  - Handle permission errors (403)

- [ ] **Path Safety**
  - Validate path doesn't escape root directory
  - Normalize paths (remove `..`, `.`)
  - Case handling on different filesystems
  - Symbolic link handling

- [ ] **File Serving Tests** (10-12 tests)
  - Serve text files
  - Serve binary files (images)
  - Serve with correct MIME types
  - Directory traversal prevention
  - File not found handling
  - Permission error handling

### 4.2 Directory Index (Optional)
- [ ] **Directory Listing**
  - List directory contents when directory requested
  - Generate HTML directory listing
  - Sort files (directories first, then alphabetically)
  - Include file sizes and modification times
  - **Tests**: 4-6 directory listing tests

### 4.3 HTTP Headers
- [ ] **Response Headers**
  - `Content-Type`: Set based on file type
  - `Content-Length`: Set to file size
  - `Cache-Control`: Configurable caching
  - `Last-Modified`: File modification time
  - `ETag`: File hash for caching
  - `Connection: close`: Proper connection handling

- [ ] **Request Headers Processing**
  - `If-Modified-Since`: Check file modification
  - `If-None-Match`: ETag comparison
  - `Range`: Partial content delivery
  - **Tests**: 6-8 header handling tests

---

## Phase 5: Example Program & Integration

**Duration**: 1 week | **Priority**: HIGH | **Blocks**: Goal completion

### 5.1 Example Program: Static File Server
```iris
(program
 (module (name "file_server") (version 0))
 (defs
  (deffn (name handler)
    (args (request HttpRequest))
    (ret HttpResponse)
    (eff !IO)
    (body
      (let (path (http.request_path request))
      (if (io.file_exists path)
        (let (content (io.read_file path))
        (let (mime (http.mime_type_for_file path))
        (http.response_ok content mime)))
        (http.response_not_found)))))

  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Net)
    (body (http.start_server 8080 handler)))))
```

### 5.2 Implementation Tasks
- [ ] Create example program file: `examples/file_server.iris`
- [ ] Document example program
- [ ] Add example to README
- [ ] Create test data directory with sample files
- [ ] **Verification**: Server runs and serves files correctly

### 5.3 Integration Tests (10-15 tests)
- [ ] Full server start/stop cycle
- [ ] Request/response round-trip
- [ ] Multiple concurrent requests (if async)
- [ ] Error conditions
- [ ] Performance (load testing)
- [ ] Real HTTP client compatibility (curl, browser)

---

## Phase 6: Advanced Features (Optional)

**Duration**: Variable | **Priority**: MEDIUM | **Depends**: Phases 1-5 complete

### 6.1 Async/Concurrent Request Handling
- [ ] **Async Implementation** (See ROADMAP.md 5.3)
  - Design async/await syntax
  - Implement async evaluation
  - Handle concurrent connections
  - **Tests**: 8-10 concurrency tests

### 6.2 SSL/HTTPS Support
- [ ] **TLS Implementation**
  - Add TLS socket support
  - Certificate handling
  - Secure connection negotiation
  - **Tests**: 6-8 HTTPS tests

### 6.3 Request/Response Middleware
- [ ] **Middleware System**
  - Request preprocessing
  - Response postprocessing
  - Error handling middleware
  - Logging middleware
  - **Tests**: 8-10 middleware tests

### 6.4 REST API Framework
- [ ] **REST Routing**
  - Path parameters: `/users/:id`
  - Query parameters: `?page=1&limit=10`
  - Request body parsing (JSON)
  - Status code helpers
  - **Tests**: 10-12 REST tests

---

## Dependencies & Prerequisites

### Must Complete First:
1. ✓ Module system (Phase 1)
2. ✓ Network effects (Phase 2)
3. ✓ HTTP module (Phase 3)
4. ✓ File serving (Phase 4)

### Should Complete (Before Phase 6):
- ✓ Example program (Phase 5)
- ✓ Integration tests (Phase 5)

### Nice to Have (Can do in parallel):
- Documentation
- Performance optimization
- Code cleanup

---

## Technical Decisions

### Architecture Choices
- **Single-threaded or Multi-threaded?**
  - Option A: Single-threaded + async/await (Phase 6.1)
  - Option B: Thread pool (simpler but less pure)
  - Decision: Single-threaded + async/await for purity

- **Mutable State for Server?**
  - Challenge: HTTP server needs mutable listener state
  - Solution: Hide mutation inside `!Net` effect
  - Document as acceptable imperative boundary

- **Built-in HTTP or External?**
  - Option A: Implement HTTP from scratch (chosen)
  - Option B: Wrap external library (easier, less control)
  - Decision: Implement from scratch for determinism

### Error Handling Strategy
- Use `Result<T, HttpError>` for all operations
- Propagate errors through call stack
- Return appropriate HTTP status codes
- Log errors (once logging added)

### Performance Considerations
- Cache MIME type mappings
- Cache file contents (if practical)
- Buffer I/O operations
- Monitor memory usage with large files

---

## Testing Strategy

### Unit Tests (60-80 tests)
- Parser (HTTP parsing)
- Builder (HTTP response)
- Module system
- I/O operations
- Network operations
- File serving
- MIME type detection
- Path safety
- Error handling

### Integration Tests (15-20 tests)
- Full request/response cycle
- Server lifecycle
- Multiple requests
- Error conditions
- Real HTTP clients
- Performance/load

### Example Program Test
- Server starts successfully
- Serves files correctly
- Handles errors gracefully
- Performance acceptable

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Module system tests | 20+ passing | 0/20 |
| Network effect tests | 15+ passing | 0/15 |
| HTTP module tests | 20+ passing | 0/20 |
| File serving tests | 12+ passing | 0/12 |
| Integration tests | 15+ passing | 0/15 |
| Example program | Fully functional | ❌ |
| Total test count | 82 → 150+ | 82/150 |
| Code coverage | >90% | TBD |
| Documentation | Complete | ❌ |

---

## Timeline Estimate

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Modules | 2-3 weeks | Week 1 | Week 3 |
| Phase 2: Net Effects | 1-2 weeks | Week 2 | Week 4 |
| Phase 3: HTTP Module | 2-3 weeks | Week 4 | Week 6 |
| Phase 4: File Serving | 1-2 weeks | Week 6 | Week 7 |
| Phase 5: Example & Tests | 1 week | Week 7 | Week 8 |
| Phase 6: Advanced (Opt) | Variable | Week 9+ | TBD |

**Total Critical Path**: 7-8 weeks

---

## Risks & Mitigations

### Risk 1: Module System Complexity
- **Impact**: High | **Probability**: Medium
- **Mitigation**: Start with simple file-based modules, iterate
- **Fallback**: Hard-code standard library functions

### Risk 2: Performance Issues
- **Impact**: Medium | **Probability**: Medium
- **Mitigation**: Profile early, optimize hot paths
- **Fallback**: Implement caching strategies

### Risk 3: Async Implementation Required
- **Impact**: High | **Probability**: High (for concurrent requests)
- **Mitigation**: Design async carefully, test thoroughly
- **Fallback**: Single-threaded server (sequential requests)

### Risk 4: HTTP Compliance
- **Impact**: Low-Medium | **Probability**: Low
- **Mitigation**: Test with real HTTP clients
- **Fallback**: Support subset of HTTP spec

---

## Resources & References

### Specifications
- [HTTP/1.1 RFC 7231](https://tools.ietf.org/html/rfc7231)
- [MIME Types IANA Registry](https://www.iana.org/assignments/media-types/)
- [URL RFC 3986](https://tools.ietf.org/html/rfc3986)

### Related Documentation
- `ROADMAP.md` - Main project roadmap
- `iris-v0-specification.md` - Language specification
- `IRIS-v0.1.md` - Core language design
- `iris-v0.2.md` - Effect system design

### Example Reference
- [Rust std::net](https://doc.rust-lang.org/std/net/) - TCP/socket design
- [Python http.server](https://docs.python.org/3/library/http.server.html) - HTTP basics
- [Node.js http](https://nodejs.org/api/http.html) - Request/response model

---

## Implementation Notes

### Module System Design Decisions
- Use file-based modules (one file = one module)
- Support nested module directories
- Standard library in `stdlib/` directory
- User modules in project root or specified paths

### HTTP Server Architecture
```
Main Entry
  ↓
Bind to Port (net.create_listener)
  ↓
Accept Connection Loop
  ├→ Read Request (net.read_bytes)
  ├→ Parse Request (http.parse_request)
  ├→ Route to Handler (http.route_request)
  ├→ Build Response (http.build_response)
  ├→ Write Response (net.write_bytes)
  └→ Close Connection (net.close_stream)
```

### File Serving Safety
- Resolve full path of requested file
- Check if path is within serving directory
- Reject if outside (prevent `../../etc/passwd`)
- Return 403 Forbidden for permission errors
- Return 404 Not Found for missing files

---

## Version Milestones

- **v0.4-alpha**: Module system working (Phase 1)
- **v0.4-beta**: HTTP server basic (Phases 1-4)
- **v0.4**: Full Goal 4 (Phases 1-5)
- **v0.5**: Advanced features (Phase 6)

---

## Next Actions (When Starting)

1. [ ] Review and approve this roadmap
2. [ ] Set up development branch `feature/goal-4`
3. [ ] Create issues for each phase
4. [ ] Assign tasks to team members
5. [ ] Set up CI/CD for testing
6. [ ] Begin Phase 1 implementation
7. [ ] Schedule weekly progress reviews

---

**Created**: 2025-12-15
**Status**: Draft - Awaiting Approval
**Owner**: IRIS Development Team
**Last Updated**: 2025-12-15
