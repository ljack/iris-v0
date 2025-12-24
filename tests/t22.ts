import { TestCase } from '../src/test-types';

export const t22: TestCase = {
  name: 'Test 22: Pure calling IO function is rejected',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t22") (version 0))
 (defs
  (deffn (name ioer)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (ioer)))))`
};
