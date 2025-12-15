import { TestCase } from '../src/test-types';

export const t46: TestCase = {
  name: 'Test 46: Nested generic types - Option<Result<T, E>>',
  expect: '(Some (Ok "found"))',
  source: `(program
 (module (name "t46") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option (Result Str Str)))
    (eff !Pure)
    (body (Some (Ok "found"))))))`
};
