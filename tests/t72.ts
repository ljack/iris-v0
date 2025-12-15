import { TestCase } from '../src/test-types';

export const t72: TestCase = {
  name: 'Test 72: Let-binding with effect propagation',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t72") (version 0))
 (defs
  (deffn (name main)
    (args) (ret (Result Str Str)) (eff !Pure)
    (body
      (let (x (io.read_file "/file.txt"))
      x)))))`
};
