import { TestCase } from '../src/test-types';

export const t26: TestCase = {
  name: 'Test 26: Same as t25 but declared !IO succeeds',
  expect: '(Ok "hello")',
  source: `(program
 (module (name "t26") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body
      (if true
          (io.read_file "/a.txt")
          (Ok "x"))))))`,
  fs: {"/a.txt":"hello"}
};
