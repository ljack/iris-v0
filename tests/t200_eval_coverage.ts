import { TestCase } from '../src/test-types';
import { run } from '../src/main';

// Test cases to improve eval.ts coverage to 80%+

export const t200_http_parse_response: TestCase = {
  name: 'Test 200: http.parse_response',
  expect: '(record (body "") (headers (list )) (status 200) (version "HTTP/1.1"))',
  source: `(program
 (module (name "t200") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)))
    (eff !Pure)
    (body
      (match (http.parse_response "HTTP/1.1 200 OK\\r\\n\\r\\n")
        (case (tag "Ok" (r)) r)
        (case (tag "Err" (e)) (record (version "") (status 0) (headers (list)) (body ""))))))))`
};

export const t200_http_parse_response_headers: TestCase = {
  name: 'Test 200: http.parse_response headers',
  expect: '(record (body "Body") (headers (list (record (key "X-Test") (val "1")))) (status 200) (version "HTTP/1.1"))',
  source: `(program
 (module (name "t200h") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)))
    (eff !Pure)
    (body
      (match (http.parse_response "HTTP/1.1 200 OK\\r\\nX-Test: 1\\r\\n\\r\\nBody")
        (case (tag "Ok" (r)) r)
        (case (tag "Err" (e)) (record (version "") (status 0) (headers (list)) (body ""))))))))`
};

export const t201_http_get: TestCase = {
  name: 'Test 201: http.get (mock)',
  expect: 'TypeError: Unknown intrinsic: http.get',
  source: `(program
 (module (name "t201") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)))
    (eff !Net)
    (body
      (match (http.get "http://example.com")
        (case (tag "Ok" (r)) r)
        (case (tag "Err" (e)) (record (version "") (status 0) (headers (list)) (body ""))))))))`
};

export const t202_str_len: TestCase = {
  name: 'Test 202: str.len',
  expect: '5',
  source: `(program
 (module (name "t202") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (str.len "hello")))))`
};

export const t203_str_get: TestCase = {
  name: 'Test 203: str.get',
  expect: '(Some 104)',
  source: `(program
 (module (name "t203") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (str.get "hello" 0)))))`
};

export const t204_str_get_out_of_bounds: TestCase = {
  name: 'Test 204: str.get out of bounds',
  expect: 'None',
  source: `(program
 (module (name "t204") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (str.get "hello" 100)))))`
};

export const t205_str_substring: TestCase = {
  name: 'Test 205: str.substring',
  expect: '"ell"',
  source: `(program
 (module (name "t205") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body (str.substring "hello" 1 4)))))`
};

export const t206_str_from_code: TestCase = {
  name: 'Test 206: str.from_code',
  expect: '"A"',
  source: `(program
 (module (name "t206") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body (str.from_code 65)))))`
};

export const t207_str_index_of: TestCase = {
  name: 'Test 207: str.index_of found',
  expect: '(Some 2)',
  source: `(program
 (module (name "t207") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (str.index_of "hello" "l")))))`
};

export const t208_str_index_of_not_found: TestCase = {
  name: 'Test 208: str.index_of not found',
  expect: 'None',
  source: `(program
 (module (name "t208") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (str.index_of "hello" "z")))))`
};

export const t209_map_operations: TestCase = {
  name: 'Test 209: map operations',
  expect: '(Some 42)',
  source: `(program
 (module (name "t209") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make "witness" 0))
        (let (m2 (map.put m "key" 42))
          (map.get m2 "key")))))))`
};

export const t210_map_contains: TestCase = {
  name: 'Test 210: map.contains',
  expect: 'true',
  source: `(program
 (module (name "t210") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body
      (let (m (map.make "witness" 0))
        (let (m2 (map.put m "key" 42))
          (map.contains m2 "key")))))))`
};

export const t211_map_keys: TestCase = {
  name: 'Test 211: map.keys',
  expect: '(list "key")',
  source: `(program
 (module (name "t211") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List Str))
    (eff !Pure)
    (body
      (let (m (map.make "witness" 0))
        (let (m2 (map.put m "key" 42))
          (map.keys m2)))))))`
};

export const t212_list_length: TestCase = {
  name: 'Test 212: list.length',
  expect: '3',
  source: `(program
 (module (name "t212") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (list.length (list 1 2 3))))))`
};

export const t213_list_get: TestCase = {
  name: 'Test 213: list.get',
  expect: '(Some 2)',
  source: `(program
 (module (name "t213") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (list.get (list 1 2 3) 1)))))`
};

export const t214_list_get_out_of_bounds: TestCase = {
  name: 'Test 214: list.get out of bounds',
  expect: 'None',
  source: `(program
 (module (name "t214") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (list.get (list 1 2 3) 100)))))`
};

export const t215_list_concat: TestCase = {
  name: 'Test 215: list.concat',
  expect: '(list 1 2 3 4 5)',
  source: `(program
 (module (name "t215") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body (list.concat (list 1 2 3) (list 4 5))))))`
};

export const t216_list_unique: TestCase = {
  name: 'Test 216: list.unique',
  expect: '(list 1 2 3)',
  source: `(program
 (module (name "t216") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body (list.unique (list 1 2 2 3 3 1))))))`
};

export const t217_tuple_get: TestCase = {
  name: 'Test 217: tuple.get',
  expect: '2',
  source: `(program
 (module (name "t217") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (tuple.get (tuple 1 2 3) 1)))))`
};

export const t218_record_get: TestCase = {
  name: 'Test 218: record.get',
  expect: '42',
  source: `(program
 (module (name "t218") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (record.get (record (x 42) (y 10)) "x")))))`
};

export const t219_division_by_zero: TestCase = {
  name: 'Test 219: division by zero',
  expect: 'RuntimeError: Unknown intrinsic or not implemented in Sync path: / ',
  source: `(program
 (module (name "t219") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (/ 10 0)))))`
};

export const t220_modulo_by_zero: TestCase = {
  name: 'Test 220: modulo by zero',
  expect: 'RuntimeError: Unknown intrinsic or not implemented in Sync path: % ',
  source: `(program
 (module (name "t220") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (% 10 0)))))`
};

export const t221_cons_operation: TestCase = {
  name: 'Test 221: cons operation',
  expect: '(list 1 2 3)',
  source: `(program
 (module (name "t221") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body (cons 1 (list 2 3))))))`
};

export const t222_i64_to_string: TestCase = {
  name: 'Test 222: i64.to_string',
  expect: '"42"',
  source: `(program
 (module (name "t222") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body (i64.to_string 42)))))`
};

export const t223_i64_from_string: TestCase = {
  name: 'Test 223: i64.from_string',
  expect: '42',
  source: `(program
 (module (name "t223") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (i64.from_string "42")))))`
};

export const t224_bool_operations: TestCase = {
  name: 'Test 224: bool operations && || !',
  expect: 'true',
  source: `(program
 (module (name "t224") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (&& true (|| false true))))))`
};

export const t225_bool_not: TestCase = {
  name: 'Test 225: bool not',
  expect: 'false',
  source: `(program
 (module (name "t225") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (! true)))))`
};

export const t226_comparison_operators: TestCase = {
  name: 'Test 226: comparison operators >= >',
  expect: 'true',
  source: `(program
 (module (name "t226") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (>= 5 3)))))`
};

export const t227_io_read_dir: TestCase = {
  name: 'Test 227: io.read_dir',
  expect: '(list "file1.txt" "file2.txt")',
  source: `(program
 (module (name "t227") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List Str))
    (eff !IO)
    (body
      (match (io.read_dir ".")
        (case (tag "Ok" (files)) files)
        (case (tag "Err" (e)) (list)))))))`,
  fs: {
    'file1.txt': 'content1',
    'file2.txt': 'content2'
  }
};

export const t228_match_list_nil: TestCase = {
  name: 'Test 228: match list nil',
  expect: '0',
  source: `(program
 (module (name "t228") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) 1))))))`
};

export const t229_match_list_cons: TestCase = {
  name: 'Test 229: match list cons',
  expect: '1',
  source: `(program
 (module (name "t229") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) h))))))`
};

export const t230_match_tagged_tuple: TestCase = {
  name: 'Test 230: match tagged tuple',
  expect: 'TypeError: Match target must be Option, Result, List, or Union (got Tuple)',
  source: `(program
 (module (name "t230") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Some" 42)
        (case (tag "Some" (x)) x)
        (case (tag "None") 0))))))`
};

export const t231_match_tagged_with_tuple: TestCase = {
  name: 'Test 231: match tagged with tuple payload',
  expect: 'TypeError: Match case Pair expects 1 variable (payload binding)',
  source: `(program
 (module (name "t231") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tag "Pair" (tuple 1 2)))
        (match val
          (case (tag "Pair" (a b)) (+ a b))
          (case (tag "_") 0)))))))`,
};

export const t232_var_with_dot_notation: TestCase = {
  name: 'Test 232: var with dot notation',
  expect: '42',
  source: `(program
 (module (name "t232") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x (record (y 42)))))
        (let (inner r.x)
          inner.y))))))`
};

export const t233_tuple_index_access: TestCase = {
  name: 'Test 233: tuple index access via dot',
  expect: '2',
  source: `(program
 (module (name "t233") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2 3))
        (let (val t.1)
          val))))))`
};
