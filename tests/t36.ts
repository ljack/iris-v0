import { TestCase } from '../src/test-types';

export const t36: TestCase = {
  name: 'Test 36: Bad Escape Sequence',
  expect: '"z"',
  source: `(program
 (module (name "t36") (version 0))
 (defs
  (deffn (name main)
    (args) (ret Str) (eff !Pure)
    (body "\z"))))`
};
