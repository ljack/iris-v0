# Goal 11: Expanded Standard Library

## Objective
Expand the IRIS Standard Library with `Map` data structure and utility functions.

## Features
- **Map Type**: `Map<K, V>`
- **Map Intrinsics**:
  - `map.make(k_wit, v_wit)`
  - `map.put(m, k, v)`
  - `map.get(m, k)`
  - `map.contains(m, k)`
  - `map.keys(m)`
- **List Utilities**:
  - `list.len(l)`
  - `list.get(l, i)`
- **Str Utilities**:
  - `str.len(s)`

## Implementation
- **TypeChecker**: Added rules for `Map`, `Tuple`, `List`.
- **Interpreter**: Implemented runtime logic using JS `Map`.
- **Parser**: Added support for `(tuple ...)` and `(list ...)` literals.

## Verification
- Verified with `tests/t125.ts` (Map operations) and `tests/t126.ts` (List/Str utils).
