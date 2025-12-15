import { TestCase } from '../src/test-types';

export const t68: TestCase = {
  name: 'Test 68: String with special characters and escapes',
  expect: '"hello\\nworld\\t!"',
  source: `(program
 (module (name "t68") (version 0))
 (defs
  (deffn (name main)
    (args) (ret Str) (eff !Pure)
    (body "hello\nworld\t!"))))`
};
