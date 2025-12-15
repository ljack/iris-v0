import { TestCase } from '../src/test-types';

export const t27: TestCase = {
  name: 'Test 27: Inference through let-binding (IO in bound expr)',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t27") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body
      (let (x (io.read_file "/a.txt"))
        x)))))`
};
