import { TestCase } from '../src/test-types';

export const t28: TestCase = {
  name: 'Test 28: Helper hides IO must still propagate',
  expect: 'TypeError: EffectMismatch: Function wrapper: Inferred !IO but declared !Pure',
  source: `(program
 (module (name "t28") (version 0))
 (defs
  (deffn (name helper)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))
  (deffn (name wrapper)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (helper)))
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (wrapper)))))`
};
