import { TestCase } from '../src/test-types';

export const t10: TestCase = {
  name: 'Test 10: effect mismatch',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t10") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (io.read_file "/a.txt")))))`
};
