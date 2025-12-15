import { TestCase } from '../src/test-types';

export const t42: TestCase = {
  name: 'Test 42: Mixed Pure and IO in if branches with !Infer',
  expect: '(Ok "data")',
  source: `(program
 (module (name "t42") (version 0))
 (defs
  (deffn (name main)
    (args) (ret (Result Str Str)) (eff !Infer)
    (body
      (if (bool.true)
        (io.read_file "/test.txt")
        (int.const 5)))))`,
  fs: {"/test.txt": "data"}
};
