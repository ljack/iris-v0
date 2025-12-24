import { TestCase } from '../src/test-types';

export const t45: TestCase = {
  name: 'Test 45: Recursive function with !Infer effect inference',
  expect: 'TypeError: EffectMismatch: Function main: Inferred !Any but declared !Pure',
  source: `(program
 (module (name "t45") (version 0))
 (defs
  (deffn (name sum_to)
    (args (n I64)) (ret I64) (eff !Infer)
    (body
      (if (<= n 0)
        0
        (+ n (sum_to (- n 1))))))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (sum_to 10)))))`
};
