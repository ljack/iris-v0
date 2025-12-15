import { TestCase } from '../src/test-types';

export const t43: TestCase = {
  name: 'Test 43: Effect inference in let-binding RHS',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t43") (version 0))
 (defs
  (deffn (name main)
    (args) (ret (Result Str Str)) (eff !Pure)
    (body
      (let (x (io.read_file "/a.txt")) x)))))`
};
