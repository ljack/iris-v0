import { TestCase } from '../src/test-types';

export const t37: TestCase = {
  name: 'Test 37: Mutual Recursion !Infer Leakage',
  expect: 'TypeError: EffectMismatch: Function safe_caller: Inferred !Any but declared !Pure',
  source: `(program
 (module (name "t37") (version 0))
 (defs
  (deffn (name safe_caller)
    (args) (ret (Result Str Str)) (eff !Pure)
    (body (call dangerous)))
  (deffn (name dangerous)
    (args) (ret (Result Str Str)) (eff !Infer)
    (body (io.read_file "/secret.txt")))
  (deffn (name main)
    (args) (ret (Result Str Str)) (eff !Pure)
    (body (call safe_caller)))))`
};
