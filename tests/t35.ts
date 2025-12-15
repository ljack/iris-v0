import { TestCase } from '../src/test-types';

export const t35: TestCase = {
  name: 'Test 35: Pattern Matching Variable Shadowing',
  expect: '10',
  source: `(program
 (module (name "t35") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (match (Some 5)
        (case (tag "Some" (x)) (let (x 10) x))
        (case (tag "None") 0))))))`
};
