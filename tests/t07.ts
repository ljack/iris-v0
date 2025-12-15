import { TestCase } from '../src/test-types';

export const t07: TestCase = {
  name: 'Test 07: recursion with fuel',
  expect: '(Some 13)',
  source: `(program
 (module (name "t07") (version 0))
 (defs
  (deffn (name fib)
    (args (n I64) (fuel I64))
    (ret (Option I64))
    (eff !Pure)
    (body
      (if (= fuel 0)
          None
          (if (<= n 1)
              (Some n)
              (match (call fib (- n 1) (- fuel 1))
                (case (tag "None") None)
                (case (tag "Some" (a))
                  (match (call fib (- n 2) (- fuel 1))
                    (case (tag "None") None)
                    (case (tag "Some" (b)) (Some (+ a b))))))))))
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (call fib 7 100)))))`
};
