import { TestCase } from '../src/test-types';

export const t23: TestCase = {
  name: 'Test 23: Declared !IO can call Pure',
  expect: '3',
  source: `(program
 (module (name "t23") (version 0))
 (defs
  (deffn (name p) (args) (ret I64) (eff !Pure) (body (+ 1 2)))
  (deffn (name main) (args) (ret I64) (eff !IO) (body (p)))))`
};
