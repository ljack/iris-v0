import { TestCase } from '../src/test-types';

export const t20: TestCase = {
  name: 'Test 20: match Err',
  expect: '"oops"',
  source: `(program
 (module (name "t20") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body
      (match (Err "oops")
        (case (tag "Ok" (v)) "fine")
        (case (tag "Err" (e)) e))))))`
};
