import { TestCase } from '../src/test-types';

export const t25: TestCase = {
  name: 'Test 25: Inference through if-branches (IO in one branch)',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t25") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body
      (if true
          (io.read_file "/a.txt")
          (Ok "x"))))))`
};
