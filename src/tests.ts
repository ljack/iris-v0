import { run } from '../src/main';

type TestCase = {
  name: string;
  source: string;
  expect: string;
  fs?: Record<string, string>;
};

const tests: TestCase[] = [
  {
    name: 'Test 01: pure add',
    expect: "3",
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
    expect: "42",
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
    expect: "9",
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
    expect: "5",
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
    expect: "0",
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
    expect: "11",
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
  {
    name: 'Test 07: recursion with fuel',
    expect: "(Some 13)",
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
    expect: '(Ok "hello")',
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
    expect: '(Err "ENOENT")',
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
    expect: "TypeError: EffectMismatch: Effect violation: !Pure cannot perform !IO in Intrinsic io.read_file",
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

let passed = 0;
let failed = 0;

tests.forEach(t => {
  try {
    console.log(`Running ${t.name}...`);
    const val = run(t.source, t.fs);

    // Check strict equality or prefix match for errors if we want to be linient
    // But canonical rules say "print output", so exact match is best.
    if (val === t.expect) {
      console.log(`✅ PASS ${t.name}`);
      passed++;
    } else {
      console.error(`❌ FAILED ${t.name}: Expected '${t.expect}', got '${val}'`);
      failed++;
    }
  } catch (e: any) {
    console.error(`❌ FAILED ${t.name}: Exception: ${e.message}`);
    failed++;
  }
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
