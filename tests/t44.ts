import { TestCase } from '../src/test-types';

export const t44: TestCase = {
  name: 'Test 44: !Any effect accepts pure and IO calls',
  expect: '42',
  source: `(program
 (module (name "t44") (version 0))
 (defs
  (deffn (name pure_fn)
    (args) (ret I64) (eff !Pure)
    (body (int.const 42)))
  (deffn (name caller)
    (args) (ret I64) (eff !Any)
    (body (call pure_fn)))
  (deffn (name main)
    (args) (ret I64) (eff !Any)
    (body (call caller)))))`
};
