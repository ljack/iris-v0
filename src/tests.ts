import { run } from '../src/index';
import { Value } from '../src/types';

type TestCase = {
  name: string;
  source: string;
  expect: any; // Simplified check
  fs?: Record<string, string>;
  shouldFail?: boolean; // Expect type error or similar
};

const tests: TestCase[] = [
  {
    name: 'Test 01: pure add',
    expect: 3n,
    source: `(program
 (module (name "t01") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ 1 2)))))`
  },
  {
    name: 'Test 02: let + arithmetic',
    expect: 42n,
    source: `(program
 (module (name "t02") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x (* 6 7))
        x)))))`
  },
  {
    name: 'Test 03: if',
    expect: 9n,
    source: `(program
 (module (name "t03") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if (<= 3 3) 9 10)))))`
  },
  {
    name: 'Test 04: Option match',
    expect: 5n,
    source: `(program
 (module (name "t04") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 5)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
  },
  {
    name: 'Test 05: None branch',
    expect: 0n,
    source: `(program
 (module (name "t05") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match None
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
  },
  {
    name: 'Test 06: simple function call',
    expect: 11n,
    source: `(program
 (module (name "t06") (version 0))
 (defs
  (deffn (name add10)
    (args (a I64))
    (ret I64)
    (eff !Pure)
    (body (+ a 10)))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call add10 1)))))`
  },
  // Recommended Test 07
  {
    name: 'Test 07: recursion with fuel',
    expect: { kind: 'Option', value: 13n },
    source: `(program
 (module (name "t07") (version 0))
 (defs
  (deffn (name fib)
    (args (n I64) (fuel I64))
    (ret (Option I64))
    (eff !Pure)
    (body
      (if (= fuel 0)
          None
          (if (<= n 1)
              (Some n)
              (match (call fib (- n 1) (- fuel 1))
                (case (tag "None") None)
                (case (tag "Some" (a))
                  (match (call fib (- n 2) (- fuel 1))
                    (case (tag "None") None)
                    (case (tag "Some" (b)) (Some (+ a b))))))))))
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (call fib 7 100)))))`
  },
  {
    name: 'Test 08: IO read_file',
    expect: { kind: 'Result', isOk: true, value: { kind: 'Str', value: "hello" } },
    fs: { "/a.txt": "hello" },
    source: `(program
 (module (name "t08") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))))`
  },
  {
    name: 'Test 09: IO read_file missing',
    expect: { kind: 'Result', isOk: false, value: { kind: 'Str', value: "ENOENT" } },
    fs: {},
    source: `(program
 (module (name "t09") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/missing.txt")))))`
  },
  {
    name: 'Test 10: effect mismatch',
    expect: "TypeError", // Type error expected
    shouldFail: true,
    source: `(program
 (module (name "t10") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (io.read_file "/a.txt")))))`
  }
];

function checkEq(actual: any, expected: any): boolean {
  if (expected === "TypeError") return false;

  // Unwrap Convenience for tests
  if (typeof expected === 'bigint') {
    return actual.kind === 'I64' && actual.value === expected;
  }

  // If both are BigInt (inside recursion)
  if (typeof actual === 'bigint' && typeof expected === 'bigint') return actual === expected;

  if (typeof expected === 'object' && expected !== null && actual !== null) {
    // If expected is array (e.g. List items)
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) return false;
      return expected.every((val, i) => checkEq(actual[i], val));
    }

    // If actual is Value object
    if (actual.kind && expected.kind) {
      if (actual.kind !== expected.kind) return false;
    }

    const k1 = Object.keys(expected);
    const k2 = Object.keys(actual);
    if (k1.length !== k2.length) return false;

    for (const key of k1) {
      // Skip internal fields if needed, but here we want exact match
      if (!k2.includes(key)) return false;
      if (!checkEq(actual[key], expected[key])) return false;
    }
    return true;
  }

  return actual === expected;
}

function safeStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint'
      ? value.toString() + 'n'
      : value
  );
}

let passed = 0;
let failed = 0;

tests.forEach(t => {
  try {
    console.log(`Running ${t.name}...`);
    const val = run(t.source, t.fs);

    if (t.shouldFail) {
      console.error(`❌ FAILED ${t.name}: Expected failure, got success`);
      failed++;
    } else {
      if (checkEq(val, t.expect)) {
        console.log(`✅ PASS ${t.name}`);
        passed++;
      } else {
        console.error(`❌ FAILED ${t.name}: Expected ${safeStringify(t.expect)}, got ${safeStringify(val)}`);
        failed++;
      }
    }
  } catch (e: any) {
    if (t.shouldFail) {
      console.log(`✅ PASS ${t.name} (Caught expected error: ${e.message})`);
      passed++;
    } else {
      console.error(`❌ FAILED ${t.name}: Exception: ${e.message}`);
      failed++;
    }
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
