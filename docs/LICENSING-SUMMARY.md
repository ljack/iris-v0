# IRIS v0 Licensing - Quick Reference

**Status**: ✅ Dual Licensing Implemented
**Model**: Rust-Style (MIT OR Apache-2.0)
**Date**: 2025-12-16

---

## Quick Answer: Which License?

```
┌─────────────────────────────────────────┐
│ Want simplicity?        → Use MIT        │
│ Want patent protection? → Use Apache 2.0 │
│ Not sure?              → Use MIT         │
└─────────────────────────────────────────┘
```

Both are free. Choose whichever works for you.

---

## License Files

| File | Size | Purpose |
|------|------|---------|
| **LICENSE** | 5.3KB | Master guide (start here) |
| **LICENSE-MIT** | 1.1KB | MIT License text |
| **LICENSE-APACHE** | 10KB | Apache 2.0 License text |

---

## One-Minute Comparison

### MIT License
```
✅ Simple (3 clauses)
✅ Ultra-permissive
✅ No patent clause
✅ Minimal overhead
❌ No explicit patent protection
```

### Apache License 2.0
```
✅ Professional (9 sections)
✅ Permissive
✅ Explicit patent grant
✅ Clear liability limits
⚠️ More complex
```

---

## Use Case Guide

### Choose MIT if:
- Building something simple
- Want minimal legal overhead
- Maximum compatibility
- Don't need patent protection
- Using with other MIT projects

### Choose Apache 2.0 if:
- Corporate/enterprise use
- Need patent protection
- Using with GPL projects
- Need clear liability limits
- Using with other Apache projects

### When in Doubt:
👉 **Choose MIT** (simpler, works for most cases)

---

## Compatibility At a Glance

| Using IRIS with... | ✅ Works? | How |
|-------------------|----------|-----|
| MIT projects | ✅ Yes | Use MIT |
| Apache projects | ✅ Yes | Use Apache 2.0 |
| GPL projects | ✅ Yes | Use Apache 2.0 |
| Proprietary code | ✅ Yes | Use either |
| Other open source | ✅ Yes | Use either |

**Result**: Zero license conflicts

---

## File Locations

```
iris-v0/
├── LICENSE              ← Start here (dual license guide)
├── LICENSE-MIT          ← MIT License text
├── LICENSE-APACHE       ← Apache 2.0 License text
├── package.json         ← license: (MIT OR Apache-2.0)
├── README.md            ← Updated with license section
└── docs/
    ├── LICENSE-COMPARISON.md  ← Detailed analysis
    ├── DUAL-LICENSING.md      ← Implementation guide
    └── LICENSING-SUMMARY.md   ← This file
```

---

## SPDX Identifier

```
SPDX-License-Identifier: (MIT OR Apache-2.0)
```

Used in:
- `package.json`: `"license": "(MIT OR Apache-2.0)"`
- Source code headers (optional)
- NPM registry
- GitHub auto-detection

---

## Key Facts

| Aspect | MIT | Apache 2.0 |
|--------|-----|-----------|
| Lines | 21 | 195 |
| Complexity | Very Simple | Professional |
| Patent Clause | No | Yes ✅ |
| Liability | Basic | Clear ✅ |
| Commercial Use | Yes ✅ | Yes ✅ |
| Proprietary Allowed | Yes ✅ | Yes ✅ |
| Open Source | Yes ✅ | Yes ✅ |

---

## Common Questions

**Q: Do I have to choose?**
No, use whichever works for you.

**Q: Can I change my choice later?**
Yes, both licenses apply to the same code.

**Q: Is this like Rust?**
Yes, exactly like Rust's dual licensing.

**Q: Does one cost money?**
No, both are free open source licenses.

**Q: Which is "better"?**
Depends on your needs. MIT is simpler. Apache is more protective.

**Q: Can I use both?**
Yes, you can include both license texts in your project.

---

## Real Projects Using This Model

- 🦀 **Rust** - Programming language
- 🚀 **Tokio** - Async runtime
- 📦 **Serde** - Serialization
- 🌐 **Hyperium** - HTTP library
- ⚡ **Futures** - Async combinators

---

## Next Steps

1. ✅ Read [LICENSE](../LICENSE) for dual licensing guide
2. ✅ Read [README.md](../README.md) for overview
3. ✅ Choose MIT or Apache 2.0 based on your needs
4. ✅ Include appropriate license text in your project

---

## Need More Details?

- **Full Comparison**: [LICENSE-COMPARISON.md](./LICENSE-COMPARISON.md)
- **Implementation Guide**: [DUAL-LICENSING.md](./DUAL-LICENSING.md)
- **Master License**: [LICENSE](../LICENSE)

---

**TL;DR**: Use MIT for simplicity, Apache for patent protection. Both are free and permissive. You can't go wrong.

