
import { TestCase } from '../src/test-types';

const MAP_TEST = `
(program
  (module (name "maptest") (version 0))
  (defs
    (deffn (name main) (args) (ret (Tuple I64 I64 I64 Bool I64)) (eff !Pure)
      (body
        (let (m0 (map.make "witness" 0))
          (let (m1 (map.put m0 "a" 10))
            (let (m2 (map.put m1 "b" 20))
              (let (v1 (map.get m2 "a"))
                (let (v2 (map.get m2 "b"))
                  (let (v3 (map.get m2 "c"))
                    (let (has-a (map.contains m2 "a"))
                      (let (keys (map.keys m2))
                        (tuple 
                           (match v1 
                             (case (tag "Some" (x)) x) 
                             (case (tag "None") 0))
                           (match v2 
                             (case (tag "Some" (x)) x) 
                             (case (tag "None") 0))
                           (match v3 
                             (case (tag "Some" (x)) x) 
                             (case (tag "None") -1))
                           has-a
                           (list.length keys)
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
)
`;

export const T125: TestCase = {
  name: 'Map Operations',
  source: MAP_TEST,
  expect: "(tuple 10 20 -1 true 2)"
};
