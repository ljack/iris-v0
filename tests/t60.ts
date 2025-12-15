import { TestCase } from '../src/test-types';

export const t60: TestCase = {
  name: 'Test 60: Record with complex nested types',
  expect: '(record (items (Some (Ok "value"))))',
  source: `(program
 (module (name "t60") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (items (Option (Result Str Str)))))
    (eff !Pure)
    (body (record (items (Some (Ok "value")))))))`
};
