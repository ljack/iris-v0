import { TestCase } from '../src/test-types';

export const t57: TestCase = {
  name: 'Test 57: Record field type mismatch',
  expect: 'TypeError: Function main return type mismatch: Expected (Record (name Str) (age I64)), got (Record (name Str) (age Str))',
  source: `(program
 (module (name "t57") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (name Str) (age I64)))
    (eff !Pure)
    (body (record (name "Alice") (age "not a number"))))))`
};
