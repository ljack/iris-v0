import { TestCase } from '../src/test-types';

export const t06: TestCase = {
  name: 'Test 06: simple function call',
  expect: '11',
  source: `(program
 (module (name "t06") (version 0))
 (defs
  (deffn (name add10)
    (args (a I64))
    (ret I64)
    (eff !Pure)
    (body (+ a 10)))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call add10 1)))))`
};
