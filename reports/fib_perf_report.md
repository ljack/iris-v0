# Fib Performance Report

- Timestamp: 2025-12-24T16:33:13.252Z
- Iris version: 0.5.15
- Git commit: e456eed4178ce8d2ca06fe2761200aab284205b8
- N: 35

## Latest Run (ts)

| Algorithm | Mean (ms) | Min (ms) | Max (ms) | Histogram |
| --- | ---: | ---: | ---: | --- |
| recursive | 4050.81 | 4015.32 | 4086.29 | ######################## |
| iterative | 33.36 | 33.08 | 33.64 | # |
| fast-doubling | 32.98 | 32.81 | 33.14 | # |
| matrix | 35.49 | 35.39 | 35.59 | # |
| memoized | 43.80 | 42.98 | 44.63 | # |

## Latest Run (wasm)

| Algorithm | Mean (ms) | Min (ms) | Max (ms) | Histogram |
| --- | ---: | ---: | ---: | --- |
| recursive | 1319.29 | 1315.11 | 1323.47 | ######################## |
| iterative | 1259.58 | 1239.55 | 1279.61 | ####################### |
| fast-doubling | 1283.69 | 1278.97 | 1288.41 | ####################### |
| matrix | 1284.64 | 1281.18 | 1288.10 | ####################### |
| memoized | 1282.77 | 1280.62 | 1284.92 | ####################### |

## History

| Timestamp | Version | Commit | N | Fastest (ts) | Slowest (ts) | Fastest (wasm) | Slowest (wasm) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2025-12-24T16:33:13.252Z | 0.5.15 | e456eed4 | 35 | 32.98 | 4050.81 | 1259.58 | 1319.29 |
| 2025-12-24T16:14:35.810Z | 0.5.15 | e456eed4 | 35 | 34.73 | 4106.10 | - | - |

