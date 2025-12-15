import { TestCase } from '../src/test-types';

export const t30: TestCase = {
  name: 'Test 30: !Infer should infer !IO if body uses IO',
  expect: '(Ok "hello")',
  source: `(program
 (module (name "t30") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Infer)
    (body (io.read_file "/a.txt")))))`,
  fs: {"/a.txt":"hello"}
};
