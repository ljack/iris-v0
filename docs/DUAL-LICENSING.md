# IRIS v0 Dual Licensing - Implementation Guide

**Date**: 2025-12-16
**Status**: Implemented ✅
**Model**: Rust-Style Dual Licensing (MIT OR Apache 2.0)

---

## Overview

IRIS v0 now uses **dual licensing** - the same licensing model as Rust, Tokio, Serde, and other major open source projects.

Users can choose to use IRIS under either:
- **MIT License** (simple, permissive)
- **Apache License 2.0** (permissive with patent protection)

---

## License Files

### File Structure

```
iris-v0/
├── LICENSE              # Dual license explanation & guide
├── LICENSE-MIT          # MIT License text
├── LICENSE-APACHE       # Apache 2.0 License text
├── package.json         # Updated with (MIT OR Apache-2.0)
├── README.md            # Updated license section
└── docs/
    ├── LICENSE-COMPARISON.md      # Detailed license analysis
    └── DUAL-LICENSING.md          # This document
```

### File Purposes

**LICENSE** (210 lines)
- Main license file explaining dual licensing
- Guide on how to choose
- Compatibility matrix
- FAQ
- References to both license texts

**LICENSE-MIT** (21 lines)
- Full MIT License text
- Standard MIT terms
- SPDX: MIT

**LICENSE-APACHE** (195 lines)
- Full Apache License 2.0 text
- 9 sections with full legal terms
- Patent grant and retaliation clause
- SPDX: Apache-2.0

---

## Implementation Details

### package.json

```json
{
  "license": "(MIT OR Apache-2.0)",
  "author": "IRIS Development Team"
}
```

**SPDX Format**: `(MIT OR Apache-2.0)`
- Indicates either license is acceptable
- Recognized by all package managers
- Clear licensing intent

### README.md

Updated with:
- Dual license badge: ![License: MIT OR Apache-2.0](badge)
- "Choose Your License" section
- Benefits of each license
- Why dual licensing
- Links to LICENSE files

### Source Code Headers (Recommended)

```typescript
/**
 * IRIS v0
 *
 * This file is distributed under the terms of either of:
 * - MIT License (see LICENSE-MIT)
 * - Apache License 2.0 (see LICENSE-APACHE)
 *
 * at your option.
 */
```

---

## License Choice Guide

### When to Use MIT

✅ **Use MIT if:**
- You want maximum simplicity
- You're building a small project using IRIS
- You prefer minimal legal overhead
- You want maximum compatibility with other MIT projects
- You don't need explicit patent protection

### When to Use Apache 2.0

✅ **Use Apache 2.0 if:**
- You want explicit patent protection
- You're in a corporate/enterprise environment
- You need professional legal clarity
- You're concerned about patent claims
- You want retaliation protection

### When in Doubt

👉 **Just use MIT** - it's simpler and works for most cases.

---

## Compatibility Matrix

### IRIS (MIT OR Apache 2.0) Compatibility

| Project License | Compatible | Use | Notes |
|-----------------|-----------|-----|-------|
| MIT | ✅ Yes | Choose MIT | Perfect match |
| Apache 2.0 | ✅ Yes | Choose Apache | Perfect match |
| GPL v3 | ✅ Yes | Choose Apache | Apache compatible with GPL |
| LGPL | ✅ Yes | Choose Apache | Apache compatible with LGPL |
| BSD | ✅ Yes | Choose either | Both compatible |
| ISC | ✅ Yes | Choose either | Both compatible |
| Proprietary | ✅ Yes | Choose MIT | MIT simpler for proprietary |

**Result**: IRIS with dual licensing is compatible with virtually any other open source or proprietary project.

---

## Real-World Projects Using Dual Licensing

### Rust Language
```
Licensed under either of:
- Apache License, Version 2.0 (LICENSE-APACHE or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license (LICENSE-MIT or http://opensource.org/licenses/MIT)

at your option.
```

### Tokio (Async Runtime)
```
Licensed under either of:
- Apache License, Version 2.0 (LICENSE-APACHE)
- MIT license (LICENSE-MIT)

at your option.
```

### Serde (Serialization)
```
Licensed under either of:
- Apache License, Version 2.0
- MIT license

at your option.
```

### Other Notable Projects
- Hyperium (HTTP library)
- Futures (async combinator library)
- Warp (web framework)
- SQLx (SQL toolkit)

All use the same dual licensing model as IRIS v0.

---

## Contributing with Dual Licenses

### For Contributors

When you contribute to IRIS, your contributions are automatically dual-licensed:

1. **No Additional Licensing Needed**
   - By contributing, you agree to dual license
   - No CLA (Contributor License Agreement) needed
   - Simple and straightforward

2. **Your Rights**
   - You retain copyright to your contributions
   - IRIS maintainers get rights under both licenses
   - Users get choice of which license to use

3. **Example**
   ```
   Copyright (c) 2025 Your Name

   Licensed under either of:
   - Apache License, Version 2.0
   - MIT License

   at your option.
   ```

### Contributor License Terms

By submitting a pull request, you agree that:
- Your contribution will be dual-licensed (MIT OR Apache 2.0)
- The IRIS project can distribute under either or both licenses
- You retain copyright to your work
- You grant necessary rights to IRIS maintainers

---

## FAQ

### Q: Do I have to include both licenses in my project?

A: No, you can include just the LICENSE file which explains both. Or include all three (LICENSE, LICENSE-MIT, LICENSE-APACHE) for clarity.

### Q: Can I use just one of the licenses in my own project?

A: Yes, you can choose MIT or Apache 2.0. You don't need to include both if you don't want to.

### Q: What if IRIS adds a third license?

A: Highly unlikely. The dual license model is stable and proven. If we ever add another license, it would be in addition to these two, not replacing them.

### Q: Can I relicense IRIS under GPL?

A: No. IRIS contributors have licensed under MIT OR Apache 2.0 only. You cannot unilaterally change the license. However, you can use IRIS under Apache 2.0 in a GPL project (Apache is GPL-compatible).

### Q: Is dual licensing "selling" something?

A: No. Dual licensing here is free. Both MIT and Apache 2.0 are free, open source licenses. This is different from "dual licensing" in some commercial contexts where you pay for a proprietary license.

### Q: Which license should I recommend to others?

A: Tell them to choose based on their needs:
- **MIT** for simplicity and fewer questions
- **Apache 2.0** for explicit patent protection

Most people choose MIT for simplicity.

### Q: What about contributors from different countries?

A: Both MIT and Apache 2.0 are internationally recognized and enforceable. No changes needed.

### Q: Can I use IRIS in a closed-source commercial product?

A: Yes, under either license. No restrictions.

---

## Migration from Single License

If someone asks about the previous single license (Apache 2.0):

**Previous**: Apache 2.0 only
**Current**: MIT OR Apache 2.0
**Why Changed**: To provide more flexibility and lower adoption barriers

**Backward Compatible**: ✅ Yes
- All software licensed under Apache 2.0 can still use the Apache 2.0 text
- Now also have the option to use MIT if preferred
- No existing code is affected
- All rights remain the same

---

## License Enforcement

### If Someone Violates the License

**Enforcement Steps**:

1. **Document Violation**
   - Note what they're doing wrong
   - Gather evidence

2. **Send Friendly Notice**
   - Email explaining the violation
   - Give them 30 days to fix it
   - Provide guidance on compliance

3. **Legal Action**
   - If they don't respond, pursue legal remedies
   - Cost and effort depend on violation severity
   - Consult with open source lawyers

4. **Termination Clause**
   - Apache 2.0 has explicit termination clause
   - If they sue you over patent, license terminates
   - MIT doesn't have termination but includes warranty disclaimer

---

## Standards & Compliance

### SPDX Identifier

- **SPDX**: `(MIT OR Apache-2.0)`
- **Used in**: package.json, source code headers, registry listings

### OSI Approved

- ✅ MIT: OSI Approved
- ✅ Apache 2.0: OSI Approved
- ✅ Dual License: OSI Compliant

### FSF Free Software

- ✅ MIT: FSF Free Software License
- ✅ Apache 2.0: FSF Free Software License (with clarifications)
- ✅ Dual License: FSF Compliant

### Package Managers

- **npm**: Recognizes `(MIT OR Apache-2.0)`
- **cargo**: Recognizes `MIT OR Apache-2.0`
- **GitHub**: Auto-detects license from LICENSE file
- **SPDX Database**: Listed as recognized combination

---

## Transition Guide

### From Single Apache 2.0

If you're coming from a project that was Apache 2.0 only:

1. **Your rights don't change**
   - Can still use Apache 2.0
   - Now also have MIT option
   - All previous uses remain valid

2. **For new code**
   - Dual license all new contributions
   - Existing code license doesn't change

3. **For distributions**
   - Include both LICENSE files
   - Update package.json
   - Update README

### From MIT Only

If you're coming from a project that was MIT only:

1. **Your rights don't change**
   - Can still use MIT
   - Now also have Apache 2.0 option
   - All previous uses remain valid

2. **For new code**
   - Dual license all new contributions
   - Can add Apache 2.0 protections

---

## Recommended Reading

### Official Sources
- [Apache License FAQ](https://www.apache.org/foundation/license-faq.html)
- [MIT License](https://opensource.org/licenses/MIT)
- [Rust License Info](https://www.rust-lang.org/policies/legal/licenses)
- [SPDX Identifier](https://spdx.org/licenses/MIT)

### Articles
- [Choosing a License on GitHub](https://choosealicense.com/)
- [Why Dual License?](https://www.synopsys.com/blogs/software-security/choosing-open-source-license/)
- [License Comparison](https://en.wikipedia.org/wiki/Comparison_of_free_and_open-source_software_licenses)

---

## Legal Disclaimer

This document is for informational purposes only and does not constitute legal advice. For specific legal questions about licensing, consult with a qualified attorney familiar with open source software licensing.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2025-12-16 | Initial dual licensing implementation |

---

## Contact

For questions about IRIS v0 licensing:

- **Issues**: [GitHub Issues](https://github.com/ljack/iris-v0/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ljack/iris-v0/discussions)
- **Email**: iris-dev@example.com

---

**Last Updated**: 2025-12-16
**Maintained By**: IRIS Development Team
**Status**: Active ✅
