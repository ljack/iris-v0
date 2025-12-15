import { TestCase } from '../src/test-types';

export const t71: TestCase = {
  name: 'Test 71: Sequential let-binding operations',
  expect: '15',
  source: `(program
 (module (name "t71") (version 0))
 (defs
  (deffn (name compute_sum)
    (args (a I64) (b I64) (c I64) (d I64) (e I64))
    (ret I64) (eff !Pure)
    (body (+ a (+ b (+ c (+ d e))))))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (call compute_sum 1 2 3 4 5)))))`
};
