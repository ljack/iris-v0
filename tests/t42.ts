import { TestCase } from '../src/test-types';

export const t42: TestCase = {
  name: 'Test 42: Type mismatch in if branches',
  expect: 'TypeError: If branches mismatch: Expected (Result Str Str), got I64',
  source: `(program
 (module (name "t42") (version 0))
 (defs
  (deffn (name main)
    (args) (ret (Result Str Str)) (eff !Infer)
    (body
      (if true
        (io.read_file "/test.txt")
        5)))))`,
  fs: {"/test.txt": "data"}
};
