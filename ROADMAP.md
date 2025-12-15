# IRIS v0 Roadmap & Task Tracking

**Project**: IRIS v0 - AI-Centric Deterministic Programming Language
**Current Status**: v0.3 Stabilization - All 82 Tests Passing ✅
**Last Updated**: 2025-12-15

---

## Table of Contents

1. [Language Features](#1-language-features)
2. [Performance & Optimization](#2-performance--optimization)
3. [Developer Experience](#3-developer-experience)
4. [Testing & Verification](#4-testing--verification)
5. [Extensions](#5-extensions)
6. [Tooling](#6-tooling)
7. [Documentation & Knowledge](#7-documentation--knowledge)

---

## 1. Language Features

### 1.1 Expand Core Operations
- [ ] **Bitwise Operations**
  - Add: `bitwise.and`, `bitwise.or`, `bitwise.xor`, `bitwise.not`
  - Add: Left/right shift operators
  - Tests: 8-10 new tests for bitwise operations

- [ ] **String Manipulation**
  - Add: `string.length`, `string.concat`, `string.substring`
  - Add: `string.contains`, `string.split`, `string.trim`
  - Add: Character/code point operations
  - Tests: 10-12 new tests for string operations

- [ ] **List Operations**
  - Add: `list.length`, `list.head`, `list.tail`
  - Add: `list.map`, `list.filter`, `list.fold`
  - Add: `list.reverse`, `list.sort`
  - Tests: 12-15 new tests for list operations

- [ ] **Math Functions**
  - Add: `math.abs`, `math.max`, `math.min`
  - Add: `math.pow`, `math.sqrt`, `math.floor`, `math.ceil`
  - Tests: 6-8 new tests for math functions

### 1.2 Pattern Matching Enhancements
- [ ] **Tuple Destructuring**
  - Enable pattern matching on tuple values
  - Support nested tuple patterns
  - Add tuple unpacking in let bindings
  - Tests: 4-6 new tests for tuple patterns

- [ ] **Record Destructuring**
  - Enable pattern matching on record fields
  - Support partial record patterns
  - Add record unpacking in function parameters
  - Tests: 4-6 new tests for record patterns

- [ ] **Guard Clauses**
  - Add `where` guards in match expressions
  - Support guards on let bindings
  - Tests: 3-5 new tests for guards

### 1.3 Generic Functions
- [ ] **Generic Type Parameters**
  - Support `fn<T>` style generic declarations
  - Implement type parameter inference
  - Support generic constraints
  - Tests: 8-10 new tests for generics

- [ ] **Polymorphic Functions**
  - Allow same function name with different arities
  - Support overloading via type dispatch
  - Tests: 4-6 new tests for overloading

### 1.4 Effect System Extensions
- [ ] **!Net Effect**
  - Add `!Net` effect for network operations
  - Implement network intrinsics: `net.request`, `net.connect`
  - Add effect subtyping: `!Net` ordering
  - Tests: 6-8 new tests for network effects

- [ ] **Custom Effects**
  - Allow user-defined effect types
  - Implement effect composition
  - Tests: 4-6 new tests for custom effects

- [ ] **Effect Constraints**
  - Add effect requirements in function signatures
  - Support effect inference in complex scenarios
  - Tests: 5-7 new tests for effect constraints

---

## 2. Performance & Optimization

### 2.1 Tail-Call Optimization (TCO)
- [ ] **Tail-Call Detection**
  - Implement AST analysis to detect tail calls
  - Mark tail-recursive function calls
  - Add TCO flag to evaluation context

- [ ] **Stack Frame Reuse**
  - Replace recursive call stack with loop
  - Implement trampolining for deep recursion
  - Benchmark: Compare before/after performance

- [ ] **Tests & Benchmarks**
  - Create benchmark suite for recursive functions
  - Add tests verifying TCO is applied
  - Measure stack depth reduction

### 2.2 Memoization & Caching
- [ ] **Pure Function Memoization**
  - Cache pure function results
  - Implement LRU cache with configurable size
  - Add cache invalidation strategies

- [ ] **Type-Aware Caching**
  - Cache results based on type information
  - Handle mutable types correctly
  - Tests: 4-6 new tests for caching correctness

### 2.3 Pattern Matching Optimization
- [ ] **Decision Tree Compilation**
  - Convert match expressions to decision trees
  - Optimize common pattern structures
  - Reduce branch evaluation overhead

- [ ] **Pattern Specialization**
  - Detect patterns that cover same values
  - Reorder patterns for faster matching
  - Tests: 6-8 performance tests

### 2.4 Evaluator Optimization
- [ ] **Environment Optimization**
  - Use map-based environments instead of lists
  - Implement environment chaining efficiently
  - Profile memory usage

- [ ] **Value Representation**
  - Use tagged unions for values
  - Optimize common cases (small integers, booleans)
  - Reduce allocation overhead

- [ ] **Benchmarking Suite**
  - Create comprehensive performance benchmarks
  - Track performance across commits
  - Identify hot paths

---

## 3. Developer Experience

### 3.1 REPL (Read-Eval-Print Loop)
- [ ] **Basic REPL**
  - Interactive expression evaluation
  - Command history (up/down arrows)
  - Multi-line input support

- [ ] **Enhanced REPL**
  - Pretty-print output with formatting
  - Error reporting with context
  - Built-in help system (`:help` command)

- [ ] **REPL Features**
  - `:load <file>` to load program definitions
  - `:reset` to clear environment
  - `:time <expr>` to measure evaluation time
  - `:edit` to open editor for multi-line
  - `:type <expr>` to show inferred type

### 3.2 Better Error Messages
- [ ] **Contextual Error Information**
  - Show source code with error highlights
  - Include suggestions for fixes
  - Provide related documentation links

- [ ] **Error Recovery**
  - Continue parsing after errors
  - Report multiple errors in single pass
  - Suggest corrections for typos

- [ ] **Error Categories**
  - Organize errors by type/category
  - Add error codes for programmatic handling
  - Create error documentation index

### 3.3 Language Server Protocol (LSP)
- [ ] **Basic LSP Implementation**
  - Implement hover information
  - Add jump-to-definition support
  - Implement go-to-references

- [ ] **IDE Integration**
  - Support VS Code extension
  - Support Emacs/Vim plugins
  - Add IntelliJ plugin

- [ ] **IDE Features**
  - Real-time type checking
  - Inline error reporting
  - Code completion
  - Signature help

### 3.4 Debugger
- [ ] **Basic Debugger**
  - Single-step execution
  - Breakpoint support
  - Variable inspection
  - Call stack display

- [ ] **Advanced Debugging**
  - Conditional breakpoints
  - Watch expressions
  - Memory inspection
  - Time-travel debugging

- [ ] **Debugger UI**
  - CLI debugger interface
  - Web-based debugger UI
  - IDE integration

---

## 4. Testing & Verification

### 4.1 Property-Based Testing
- [ ] **Generator Framework**
  - Create value generators for all types
  - Implement shrinking for failed properties
  - Add property combinators

- [ ] **Property Test Suite**
  - Test type system properties
  - Test effect system properties
  - Test evaluator correctness properties
  - 20-30 property-based tests

### 4.2 Formal Verification
- [ ] **Type Safety Proof**
  - Formally prove type safety
  - Prove soundness of effect system
  - Document proof invariants

- [ ] **Evaluator Correctness**
  - Prove evaluator implements specification
  - Verify effect tracking correctness
  - Tests: Formal verification test suite

### 4.3 Mutation Testing
- [ ] **Mutation Generator**
  - Create mutations of type checker
  - Create mutations of evaluator
  - Create mutations of parser

- [ ] **Mutation Test Suite**
  - Run 100+ mutations
  - Verify test suite catches mutations
  - Report mutation kill rate
  - Target: >95% mutation kill rate

### 4.4 Performance Benchmarks
- [ ] **Benchmark Suite**
  - Recursion performance (fibonacci, factorial)
  - Pattern matching performance
  - Type checking performance
  - Large program performance

- [ ] **Regression Testing**
  - Track performance across versions
  - Alert on performance regressions
  - Historical performance graphs

---

## 5. Extensions

### 5.1 Bytecode Compiler
- [ ] **Bytecode Specification**
  - Design bytecode instruction set
  - Document bytecode format
  - Plan compilation strategy

- [ ] **Compiler Implementation**
  - AST to bytecode compilation
  - Instruction set implementation
  - Bytecode interpreter

- [ ] **Optimizations**
  - Constant folding at compile time
  - Dead code elimination
  - Bytecode optimization passes

- [ ] **Testing**
  - Bytecode equivalence tests
  - Performance benchmarks vs. direct interpretation

### 5.2 Module System
- [ ] **Module Syntax**
  - Define module declaration syntax
  - Design import/export syntax
  - Plan namespace management

- [ ] **Module Resolution**
  - File-based module resolution
  - Standard library organization
  - Dependency tracking

- [ ] **Module Features**
  - Public/private visibility
  - Re-exports
  - Module aliasing

- [ ] **Standard Library**
  - Core module: `core` (basic types and functions)
  - Math module: `math` (mathematical operations)
  - String module: `string` (string operations)
  - List module: `list` (list operations)
  - IO module: `io` (input/output)

### 5.3 Async/Await Support
- [ ] **Async Syntax**
  - Design async function syntax
  - Design await expression syntax
  - Plan effect tracking for async

- [ ] **Async Implementation**
  - Async/await desugaring
  - Promise-like type system
  - Concurrent evaluation strategy

- [ ] **Effect Integration**
  - New `!Async` effect
  - Effect subtyping with async
  - Tests: 10-15 async tests

### 5.4 Constraint Solving
- [ ] **Constraint Language**
  - Define type constraints
  - Implement constraint solver
  - Add constraint simplification

- [ ] **Type Inference**
  - Use constraints for inference
  - Support polymorphic types
  - Handle overloading via constraints

---

## 6. Tooling

### 6.1 Formatter/Linter
- [ ] **Code Formatter**
  - Consistent indentation rules
  - Line length limits
  - Quote style preferences
  - Configurable via `.irisrc` file

- [ ] **Linter**
  - Dead code detection
  - Unused variables
  - Naming conventions
  - Type annotation suggestions

- [ ] **Autofix**
  - Automatic formatting
  - Automatic linter fixes
  - Integration with IDE save

### 6.2 Documentation Generator
- [ ] **Doc Comments**
  - Support `/**...*/` style doc comments
  - Extract documentation metadata
  - Generate HTML/Markdown docs

- [ ] **API Documentation**
  - Function signature documentation
  - Type documentation
  - Example code blocks
  - Cross-references

- [ ] **Project Documentation**
  - Auto-generate module index
  - Create dependency graphs
  - Generate API reference

### 6.3 Syntax Highlighting
- [ ] **Highlight Grammar**
  - Create TextMate grammar
  - Define syntax token types
  - Theme customization

- [ ] **Editor Support**
  - VS Code extension
  - Vim/Neovim plugin
  - Emacs mode
  - Sublime Text package

- [ ] **Web Support**
  - Highlight.js integration
  - Prism.js integration
  - Web-based syntax highlighter

### 6.4 Playground/Web Interpreter
- [ ] **Web Frontend**
  - Interactive code editor
  - Real-time evaluation
  - Error reporting display
  - Output console

- [ ] **Features**
  - Share code via URL
  - Save/load programs
  - Example programs library
  - Documentation in sidebar

- [ ] **Deployment**
  - WASM compilation support
  - Serverless function deployment
  - GitHub Pages hosting

---

## 7. Documentation & Knowledge

### 7.1 Implementation Guide
- [ ] **Architecture Overview**
  - System architecture diagram
  - Module responsibilities
  - Data flow documentation

- [ ] **Parser Documentation**
  - Grammar specification (BNF)
  - Tokenizer documentation
  - Parser algorithm explanation
  - Error recovery strategy

- [ ] **Type Checker Documentation**
  - Type system formal specification
  - Type inference algorithm
  - Effect system rules
  - Proof of type safety

- [ ] **Evaluator Documentation**
  - Evaluation semantics
  - Variable scoping rules
  - Function call semantics
  - Pattern matching algorithm

- [ ] **Contribution Guide**
  - Setting up development environment
  - Testing guidelines
  - Code style guide
  - Pull request process

### 7.2 Language Tutorial
- [ ] **Beginner Tutorial**
  - Chapter 1: Hello World & Literals
  - Chapter 2: Arithmetic & Variables
  - Chapter 3: Control Flow (if expressions)
  - Chapter 4: Functions & Recursion
  - Chapter 5: Collections (List, Record)

- [ ] **Intermediate Tutorial**
  - Chapter 6: Pattern Matching
  - Chapter 7: Option & Result Types
  - Chapter 8: Error Handling with Result
  - Chapter 9: Writing Pure Functions
  - Chapter 10: Understanding Effects

- [ ] **Advanced Tutorial**
  - Chapter 11: Effect System Deep Dive
  - Chapter 12: Generic Types
  - Chapter 13: Performance Optimization
  - Chapter 14: Building Libraries
  - Chapter 15: Real-world Project

- [ ] **Interactive Examples**
  - Runnable code examples
  - Interactive playground links
  - Exercise problems with solutions

### 7.3 Design Decisions Documentation
- [ ] **Why IRIS Design**
  - Why S-expressions
  - Why immutability by default
  - Why explicit effects
  - Why no type inference for effects

- [ ] **Trade-offs**
  - Simplicity vs. expressiveness
  - Performance vs. determinism
  - Type safety vs. flexibility
  - Features vs. implementation complexity

- [ ] **Comparisons**
  - IRIS vs. Rust (safety, effects)
  - IRIS vs. Haskell (purity, effects)
  - IRIS vs. TypeScript (types, effects)
  - IRIS vs. Python (simplicity, safety)

### 7.4 Case Studies
- [ ] **Case Study: File Processing**
  - Reading CSV files with Result types
  - Parsing and validation
  - Error handling patterns
  - Complete working example

- [ ] **Case Study: HTTP Server**
  - Network effect management
  - Request/response handling
  - Error handling and logging
  - Performance considerations

- [ ] **Case Study: Data Analysis**
  - Working with large lists
  - Functional transformations
  - Pure computations
  - Complete working example

- [ ] **Case Study: Game Logic**
  - Pure game state management
  - Pure function composition
  - Deterministic behavior
  - Complete working example

---

## Priority Levels & Sequencing

### Phase 1: Foundation (High Priority)
**Goal**: Core language usability
- [ ] Better error messages (3.2)
- [ ] REPL implementation (3.1)
- [ ] Language tutorial (7.2)
- [ ] String operations (1.2.1)

**Estimated effort**: 4-6 weeks

### Phase 2: Professional Tools (Medium Priority)
**Goal**: Production-ready tooling
- [ ] Formatter/Linter (6.1)
- [ ] Syntax highlighting (6.3)
- [ ] LSP implementation (3.3)
- [ ] Documentation generator (6.2)

**Estimated effort**: 6-8 weeks

### Phase 3: Performance (Medium Priority)
**Goal**: Scalable execution
- [ ] Tail-call optimization (2.1)
- [ ] Pattern matching optimization (2.3)
- [ ] Benchmarking suite (2.4)
- [ ] Bytecode compiler (5.1)

**Estimated effort**: 8-10 weeks

### Phase 4: Advanced Features (Lower Priority)
**Goal**: Extended language capabilities
- [ ] Module system (5.2)
- [ ] Async/await (5.3)
- [ ] Custom effects (1.4.2)
- [ ] Generic functions (1.3)

**Estimated effort**: 10-14 weeks

### Phase 5: Verification & Polish (Lower Priority)
**Goal**: Correctness & quality
- [ ] Property-based testing (4.1)
- [ ] Formal verification (4.2)
- [ ] Mutation testing (4.3)
- [ ] Implementation guide (7.1)

**Estimated effort**: 8-12 weeks

---

## Current Metrics

| Metric | Value |
|--------|-------|
| Lines of Code (Core) | 1,108 |
| Test Count | 82 |
| Test Pass Rate | 100% |
| Git Commits | 13 |
| Language Features | ~15 |
| Specification Pages | 4 |

---

## Notes & Considerations

### Architectural Constraints
- Maintain determinism in all operations
- Keep S-expression syntax
- Preserve type safety properties
- Keep effect system explicit

### Design Principles
- Simplicity over features
- Correctness over speed (unless optimization phase)
- AI-centric optimization
- Machine-readable output

### Technical Debt
- None identified in current codebase
- Monitor performance as features added
- Keep test coverage >95%

---

## Version History

- **v0.1**: Core language foundation (10 tests)
- **v0.2**: Effect lattice system (20 tests)
- **v0.3**: Adversarial test suite (82 tests)
- **v0.4**: TBD (next major version)

---

## Contact & Contributions

For questions about this roadmap or to contribute:
1. Check existing issues/discussions
2. Create detailed GitHub issue
3. Fork and submit pull request
4. Follow contribution guidelines in implementation guide

---

**Last Updated**: 2025-12-15
**Maintained By**: IRIS Development Team
**License**: MIT
