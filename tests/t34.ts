import { TestCase } from '../src/test-types';

export const t34: TestCase = {
  name: 'Test 34: Duplicate Record Fields (Last wins)',
  expect: '(record (a 2))',
  source: `(program
 (module (name "t34") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (a I64)))
    (eff !Pure)
    (body (record (a 1) (a 2))))))`
};
