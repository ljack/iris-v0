import { TestCase } from '../src/test-types';

export const t50: TestCase = {
  name: 'Test 50: Option/Result type mismatch in constructor',
  expect: 'TypeError: Expression type mismatch',
  source: `(program
 (module (name "t50") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (Some "not an int")))))`
};
