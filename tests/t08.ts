import { TestCase } from '../src/test-types';

export const t08: TestCase = {
  name: 'Test 08: IO read_file',
  expect: '(Ok "hello")',
  source: `(program
 (module (name "t08") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))))`,
  fs: {"/a.txt":"hello"}
};
