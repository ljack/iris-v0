import { TestCase } from '../src/test-types';

export const t51: TestCase = {
  name: 'Test 51: Nested pattern matching on Option<Result>',
  expect: '"ok_value"',
  source: `(program
 (module (name "t51") (version 0))
 (defs
  (deffn (name main)
    (args) (ret Str) (eff !Pure)
    (body
      (match (Some (Ok "ok_value"))
        (case (tag "Some" (result))
          (match result
            (case (tag "Ok" (v)) v)
            (case (tag "Err" (e)) "error")))
        (case (tag "None") "none"))))))`
};
