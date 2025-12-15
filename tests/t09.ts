import { TestCase } from '../src/test-types';

export const t09: TestCase = {
  name: 'Test 09: IO read_file missing',
  expect: '(Err "ENOENT")',
  source: `(program
 (module (name "t09") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/missing.txt")))))`,
  fs: {}
};
