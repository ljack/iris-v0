import { TestCase } from '../src/test-types';

export const t80: TestCase = {
  name: 'Test 80: If branches with Option type',
  expect: '(Some 42)',
  source: `(program
 (module (name "t80") (version 0))
 (defs
  (deffn (name main)
    (args) (ret (Option I64)) (eff !Pure)
    (body
      (if true
        (Some 42)
        (Some 0))))))`
};
