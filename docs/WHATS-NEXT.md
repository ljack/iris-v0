# IRIS v0 - What's Next? Strategic Roadmap

**Date**: 2025-12-16
**Current Status**: v0.4 baseline with 82% code coverage
**Team Status**: You coding + Antigravity building features
**Question**: What should we work on next?

---

## 📊 Current State Assessment

### Completed Work ✅
- ✅ Core language implementation (IRIS v0.1-v0.5)
- ✅ Web Playground with syntax highlighting & Monaco Editor
- ✅ Concurrency (Actors, `sys.spawn`, `sys.send`)
- ✅ Expanded StdLib (Map, List, Str extensions)
- ✅ 99 tests (100% passing)
- ✅ Docs/Playground deployed to GitHub Pages

### In Progress 🔨
- 🔨 **Planning Phase**: Deciding on v0.6 focus

### Known Gaps ⚠️
- [x] Real network operations (Implemented via Node.js net/http)
- [x] Self-hosting compiler (Phases 1-5 Verified: Lexer, Parser, TypeChecker, TS/WASM Codegen, Pipeline Integration)
- ⚠️ Tuple types implemented but need more exhaustive tests
- ⚠️ Module system needs circular import detection polish
- ⚠️ Tool host docs and examples need expansion (deftool + metadata)

---

## 🎯 Strategic Options for Next Work

You have three clear strategic directions:

---

## **OPTION 1: Improve Code Quality (Coverage Path)**

### Focus
Increase code coverage from 82% to 92%

### What You'd Do
1. Implement 21 recommended tests (see TEST-RECOMMENDATIONS.md)
2. Fix critical gaps (division by zero, parser errors)
3. Add edge case tests (tuples, lists, strings)
4. Improve error messages

### Timeline
- Critical (2 hours): 4 tests
- High-priority (5 hours): 8 tests
- Medium-priority (7 hours): 6 tests
- **Total: 12-16 hours** (3-4 days)

### Outcome
- Coverage: 82% → 92%
- Stability: Better error handling, no crashes
- Quality: B+ → A-
- Release ready: YES, more polished

### Pros
✅ Straightforward task (tests are planned)
✅ Measurable progress (coverage %)
✅ Improves code reliability
✅ Can work in parallel with Antigravity

### Cons
❌ Not new features (maintenance work)
❌ Doesn't unblock new functionality
❌ Users don't see improvements

### Recommended For
- If you want **stability and polish** before release
- If you want **clear metrics** on progress
- If you prefer **systematic work** with templates

---

## **OPTION 2: Real Network Implementation (Production Path)**

### Focus
Replace network operation stubs with real TCP socket implementation

### What You'd Do
1. Implement real `net.listen`, `net.accept`, `net.read`, `net.write`, `net.close`
2. Replace mock implementations in eval.ts
3. Add real HTTP server example
4. Test with actual socket connections
5. Fix any evaluation issues

### Timeline
- Design (2 hours): How to handle async in interpreter
- Implementation (6-8 hours): Real TCP operations
- Testing (4-6 hours): Real socket tests
- Documentation (2 hours): Usage guide
- **Total: 14-18 hours** (3-4 days)

### Outcome
- Real HTTP server that works with actual clients
- Production-ready networking
- Tests t110-t113 actually work with real sockets
- Can serve real files over HTTP

### Pros
✅ Major feature completeness
✅ Production ready
✅ Unblocks real use cases
✅ Impressive demo potential

### Cons
❌ Complex implementation (async handling)
❌ More bugs likely (network is tricky)
❌ Higher maintenance burden
❌ Testing requires real sockets

### Recommended For
- If you want **production readiness**
- If you want **user-facing features** to work
- If you want **impressive demo** potential

---

## **OPTION 3: Documentation & Examples (Enablement Path)**

### Focus
Create comprehensive documentation, tutorials, and example programs

### What You'd Do
1. Write IRIS language tutorial (10 pages)
2. Create 5-10 example programs (fibonacci, web server, etc.)
3. Write API documentation (include tool host + deftool metadata)
4. Create video walkthrough (optional)
5. Write contribution guide
6. Create troubleshooting guide

### Timeline
- Tutorial (4 hours)
- Example programs (4-6 hours)
- API docs (3 hours)
- Guides (2-3 hours)
- **Total: 13-16 hours** (2-3 days)

### Outcome
- Beautiful documentation (like Rust book)
- Users can learn and use IRIS easily
- Example programs showcase features
- Welcoming for contributors

### Pros
✅ High impact on adoption
✅ Improves user experience
✅ Attracts contributors
✅ Clear, measurable scope

### Cons
❌ No code improvements
❌ Doesn't fix bugs
❌ Less technical satisfaction
❌ Requires writing skill

### Recommended For
- If you want **user adoption**
- If you want **clear communication**
- If you prefer **writing** over coding
- If project is ready to demo

---

## **OPTION 4: Hybrid Approach (Balanced Path)**

### Focus
Do a mix of all three to get comprehensive value

### What You'd Do

**Week 1** (40% effort):
- Implement critical coverage tests (4 tests, 2 hours)
- Fix division by zero, parser errors (3 hours)
- Write basic IRIS tutorial (4 hours)
- Total: 9 hours

**Week 2** (60% effort):
- Implement high-priority tests (8 tests, 5 hours)
- Start real network implementation (design phase, 2 hours)
- Create 2-3 example programs (3 hours)
- Total: 10 hours

**Total: 19 hours** (2-3 weeks at part-time)

### Outcome
- Coverage: 82% → 88%
- Documentation: Tutorials + examples
- Networking: Foundation laid for real implementation
- Release quality: Production ready

### Pros
✅ Balanced value
✅ Measurable progress on multiple fronts
✅ Risk reduction
✅ User-facing + code quality

### Cons
❌ Context switching
❌ Nothing fully complete
❌ Harder to measure progress
❌ More complexity

### Recommended For
- If you want **comprehensive improvement**
- If you have **flexible timeline**
- If you want **risk reduction**

---

### OPTION 4: Self-Hosting Compiler Phase 1 (IN PROGRESS)

**Goal**: Implement `lexer.iris`, `parser.iris`, and `eval.iris` in Iris itself.
**Status**:
- `lexer.iris`: Implemented & Tested (T126?)
- `parser.iris`: Implemented & Tested (T128)
- `eval.iris` (interpreter): Implemented & Tested (T130)
- **Next**: Type checker and code generation.list handling
3. Fix language gaps discovered during dogfooding

### Timeline
- 3 days to write Lexer in IRIS

### Outcome
- First non-trivial IRIS program
- Proven capability for complex logic

### Pros
✅ "Dogfooding" - proves language is usable
✅ Finds stdlib gaps immediately
✅ Extremely cool milestone

---

## 🎲 **My Recommendation**

Given the current state (Playground & StdLib ready):

### **I recommend: OPTION 4 (Self-Hosting Compiler Phase 1)**

**Why?**
1. We just improved Maps, Lists, and Strings (Goal 11).
2. Writing a Lexer immediately verifies these new features.
3. It's distinct from "just adding features" -> uses what we have.

**Next Best**: Option 2 (Real Networking) if you prefer systems programming over compilers.

---

## 🎯 **Final Answer: What's Next?**

**Your move**:
- **Option 1**: Polish (Tests/Coverage)
- **Option 2**: Real Networking (HTTP Server)
- **Option 3**: Documentation (Adoption)
- **Option 4**: Self-Hosting Compiler (Validation/Dogfooding)

**Decision**: ____________________

---

**Next**: Reply with your choice and I'll create your detailed action plan!
