import { TestCase } from '../src/test-types';

export const t24: TestCase = {
  name: 'Test 24: Declared !Any can call IO',
  expect: '(Ok "hello")',
  source: `(program
 (module (name "t24") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Any)
    (body (io.read_file "/a.txt")))))`,
  fs: {"/a.txt":"hello"}
};
