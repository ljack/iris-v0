
import { TestCase } from '../src/test-types';

const LIST_STR_TEST = `
(program
  (module (name "liststrtest") (version 0))
  (defs
    (deffn (name main) (args) (ret (Tuple I64 I64 I64 I64 I64)) (eff !Pure)
      (body
        (let (l (list 1 2 3))
          (let (len (list.length l))
            (let (first (list.get l 0))
              (let (second (list.get l 1))
                (let (missing (list.get l 5))
                  (let (s "hello")
                    (let (slen (str.len s))
                      (tuple 
                         len 
                         (match first (case (tag "Some" (x)) x) (case (tag "None") -1))
                         (match second (case (tag "Some" (x)) x) (case (tag "None") -1))
                         (match missing (case (tag "Some" (x)) x) (case (tag "None") -1))
                         slen
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)
`;

export const T126: TestCase = {
  name: 'List and Str Utils',
  source: LIST_STR_TEST,
  expect: "(tuple 3 1 2 -1 5)"
};
