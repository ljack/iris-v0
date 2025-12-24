import { TestCase } from '../src/test-types';

export const t21: TestCase = {
  name: 'Test 21: Pure can call Pure',
  expect: '3',
  source: `(program
 (module (name "t21") (version 0))
 (defs
  (deffn (name p) (args) (ret I64) (eff !Pure) (body (+ 1 2)))
  (deffn (name main) (args) (ret I64) (eff !Pure) (body (p)))))`
};
