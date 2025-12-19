
import { TestCase } from '../src/test-types';

export const t421: TestCase = {
    name: 'Test 421: List Get (Async)',
    source: `(program
    (module (name "t421") (version 0))
    (defs
      (deffn (name main) (args) (ret (Tuple (Option I64) (Option I64) (Option I64))) (eff !Any)
        (body 
          (let (l (list 1 2 3))
            (tuple (list.get l 0) (list.get l 2) (list.get l 3)))
        )
      )
    )
  )`,
    expect: '(tuple (Some 1) (Some 3) None)'
};

export const t422: TestCase = {
    name: 'Test 422: List Concat (Async)',
    source: `(program
    (module (name "t422") (version 0))
    (defs
      (deffn (name main) (args) (ret (List I64)) (eff !Any)
        (body 
          (let (l1 (list 1))
          (let (l2 (list 2))
            (list.concat l1 l2)
          ))
        )
      )
    )
  )`,
    expect: '(list 1 2)'
};

export const t423: TestCase = {
    name: 'Test 423: List Unique (Async)',
    source: `(program
    (module (name "t423") (version 0))
    (defs
      (deffn (name main) (args) (ret (List I64)) (eff !Any)
        (body 
          (list.unique (list 1 2 1 3 2))
        )
      )
    )
  )`,
    expect: '(list 1 2 3)'
};

export const t424: TestCase = {
    name: 'Test 424: Map Operations (Async)',
    source: `(program
    (module (name "t424") (version 0))
    (defs
      (deffn (name main) (args) (ret (Tuple (Option I64) (Option I64) Bool)) (eff !Any)
        (body 
          (let (m0 (map.make "k" 0))
          (let (m1 (map.put m0 "k1" 10))
          (let (m2 (map.put m1 "k2" 20))
            (tuple (map.get m2 "k1") (map.get m2 "k3") (map.contains m2 "k2"))
          )))
        )
      )
    )
  )`,
    expect: '(tuple (Some 10) None true)'
};

export const t425: TestCase = {
    name: 'Test 425: Map Keys (Async)',
    source: `(program
    (module (name "t425") (version 0))
    (defs
      (deffn (name main) (args) (ret (List Str)) (eff !Any)
        (body 
          (let (m (map.put (map.make "k" 0) "k" 1))
            (map.keys m)
          )
        )
      )
    )
  )`,
    expect: '(list "k")'
};

export const t426: TestCase = {
    name: 'Test 426: Record Get (Async)',
    source: `(program
    (module (name "t426") (version 0))
    (defs
      (deffn (name main) (args) (ret I64) (eff !Any)
        (body 
          (let (r (record (a 1) (b 2)))
            (record.get r "b")
          )
        )
      )
    )
  )`,
    expect: '2'
};

export const t427: TestCase = {
    name: 'Test 427: Tuple Get (Async)',
    source: `(program
    (module (name "t427") (version 0))
    (defs
      (deffn (name main) (args) (ret I64) (eff !Any)
        (body 
          (let (t (tuple 10 20))
            (tuple.get t 1)
          )
        )
      )
    )
  )`,
    expect: '20'
};

export const t428: TestCase = {
    name: 'Test 428: I64/String Conversions (Async)',
    source: `(program
    (module (name "t428") (version 0))
    (defs
      (deffn (name main) (args) (ret (Tuple Str I64)) (eff !Any)
        (body 
          (tuple (i64.to_string 123) (i64.from_string "456"))
        )
      )
    )
  )`,
    expect: '(tuple "123" 456)'
};

export const t429: TestCase = {
    name: 'Test 429: String Intrinsics (Async)',
    source: `(program
    (module (name "t429") (version 0))
    (defs
      (deffn (name main) (args) (ret (Tuple Bool Bool I64 (Option I64) Str Str (Option I64) (Option I64))) (eff !Any)
        (body 
          (let (s "hello")
            (tuple 
              (str.contains s "ll")
              (str.ends_with s "lo")
              (str.len "hi")
              (str.get "hi" 1)
              (str.substring s 1 3)
              (str.from_code 65)
              (str.index_of s "ll")
              (str.index_of s "x")
            )
          )
        )
      )
    )
  )`,
    expect: '(tuple true true 2 (Some 105) "el" "A" (Some 2) None)'
};

export const tests = [t421, t422, t423, t424, t425, t426, t427, t428, t429];
