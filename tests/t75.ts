import { TestCase } from '../src/test-types';

export const t75: TestCase = {
  name: 'Test 75: Let-binding with complex nested expression',
  expect: '100',
  source: `(program
 (module (name "t75") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (let (x
        (match (Some 50)
          (case (tag "Some" (v)) v)
          (case (tag "None") 0)))
      (+ x x))))))`
};
