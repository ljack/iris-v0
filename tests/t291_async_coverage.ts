import { TestCase } from '../src/test-types';
import { run } from '../src/main';

// Tests for async evaluation paths (evalExpr, evalIntrinsic)

export const t291_async_match_tagged_tuple: TestCase = {
  name: 'Test 291: async match tagged with tuple',
  expect: '3',
  source: `(program
 (module (name "t291") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tagged "Pair" (tuple 1 2)))
        (match val
          (case (tag "Pair" (a b)) (+ a b))
          (case (tag "_") 0))))))`
};

export const t292_async_match_list_cons: TestCase = {
  name: 'Test 292: async match list cons',
  expect: '1',
  source: `(program
 (module (name "t292") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1 2 3)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) h)))))`
};

export const t293_async_match_list_two_vars: TestCase = {
  name: 'Test 293: async match list with two vars',
  expect: '2',
  source: `(program
 (module (name "t293") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1 2 3)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) (list.length t))))))`
};

export const t294_async_match_tuple_tagged: TestCase = {
  name: 'Test 294: async match tuple as tagged',
  expect: '42',
  source: `(program
 (module (name "t294") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Some" 42)
        (case (tag "Some" (x)) x)
        (case (tag "None") 0)))))`
};

export const t295_async_match_tuple_multiple_vars: TestCase = {
  name: 'Test 295: async match tuple with multiple vars',
  expect: '3',
  source: `(program
 (module (name "t295") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Pair" 1 2)
        (case (tag "Pair" (a b)) (+ a b))
        (case (tag "_") 0)))))`
};

export const t296_async_match_wildcard: TestCase = {
  name: 'Test 296: async match wildcard',
  expect: '100',
  source: `(program
 (module (name "t296") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0)
        (case (tag "_") 100)))))`
};

export const t297_async_match_no_match: TestCase = {
  name: 'Test 297: async match no matching case',
  expect: 'RuntimeError: No matching case',
  source: `(program
 (module (name "t297") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0)))))`
};

export const t298_async_record: TestCase = {
  name: 'Test 298: async record creation',
  expect: '(record (x 42) (y 10))',
  source: `(program
 (module (name "t298") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (x I64) (y I64)))
    (eff !Pure)
    (body (record (x 42) (y 10)))))`
};

export const t299_async_tagged: TestCase = {
  name: 'Test 299: async tagged creation',
  expect: '(tagged "Some" 42)',
  source: `(program
 (module (name "t299") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Tagged "Some" I64))
    (eff !Pure)
    (body (tagged "Some" 42))))`
};

export const t300_async_tuple: TestCase = {
  name: 'Test 300: async tuple creation',
  expect: '(tuple 1 2 3)',
  source: `(program
 (module (name "t300") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Tuple I64 I64 I64))
    (eff !Pure)
    (body (tuple 1 2 3))))`
};

export const t301_async_list: TestCase = {
  name: 'Test 301: async list creation',
  expect: '(list 1 2 3)',
  source: `(program
 (module (name "t301") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body (list 1 2 3))))`
};

export const t302_async_intrinsic: TestCase = {
  name: 'Test 302: async intrinsic call',
  expect: '3',
  source: `(program
 (module (name "t302") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ 1 2))))`
};

export const t303_async_let: TestCase = {
  name: 'Test 303: async let binding',
  expect: '30',
  source: `(program
 (module (name "t303") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x 10)
        (let (y 20)
          (+ x y))))))`
};

export const t304_async_if: TestCase = {
  name: 'Test 304: async if',
  expect: '10',
  source: `(program
 (module (name "t304") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if true 10 20))))`
};

export const t305_async_if_else: TestCase = {
  name: 'Test 305: async if else',
  expect: '20',
  source: `(program
 (module (name "t305") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if false 10 20))))`
};

export const t306_async_var_dot_notation: TestCase = {
  name: 'Test 306: async var dot notation',
  expect: '42',
  source: `(program
 (module (name "t306") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x (record (y 42)))))
        (let (inner r.x)
          inner.y)))))`
};

export const t307_async_var_tuple_index: TestCase = {
  name: 'Test 307: async var tuple index',
  expect: '2',
  source: `(program
 (module (name "t307") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2 3))
        (let (val t.1)
          val)))))`
};

export const t308_async_var_error_unknown_field: TestCase = {
  name: 'Test 308: async var unknown field error',
  expect: 'RuntimeError: Unknown field',
  source: `(program
 (module (name "t308") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x 42)))
        (let (val r.nonexistent)
          val)))))`
};

export const t309_async_var_error_tuple_index: TestCase = {
  name: 'Test 309: async var tuple index error',
  expect: 'RuntimeError: out of bounds',
  source: `(program
 (module (name "t309") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2))
        (let (val t.100)
          val)))))`
};

export const t310_async_var_error_invalid_access: TestCase = {
  name: 'Test 310: async var invalid access error',
  expect: 'RuntimeError: Cannot access field',
  source: `(program
 (module (name "t310") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x 42)
        (let (val x.field)
          val)))))`
};

export const t311_async_call_unknown_function: TestCase = {
  name: 'Test 311: async call unknown function',
  expect: 'RuntimeError: Unknown function',
  source: `(program
 (module (name "t311") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call nonexistent))))`
};

export const t312_async_call_arity_mismatch: TestCase = {
  name: 'Test 312: async call arity mismatch',
  expect: 'RuntimeError: Arity mismatch',
  source: `(program
 (module (name "t312") (version 0))
 (defs
  (deffn (name f)
    (args (x I64))
    (ret I64)
    (eff !Pure)
    (body x))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call f 1 2))))`
};

export const t313_async_constants: TestCase = {
  name: 'Test 313: async constants',
  expect: '314',
  source: `(program
 (module (name "t313") (version 0))
 (defs
  (defconst (name PI) (type I64) (value 314))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body PI)))`
};

export const t314_async_constants_in_expr: TestCase = {
  name: 'Test 314: async constants in expression',
  expect: '315',
  source: `(program
 (module (name "t314") (version 0))
 (defs
  (defconst (name X) (type I64) (value 42))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ X 1))))`
};

export const t315_async_net_listen: TestCase = {
  name: 'Test 315: async net.listen',
  expect: '(record (isOk true) (value 1))',
  source: `(program
 (module (name "t315") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.listen 8080))))`
};

export const t316_async_net_accept: TestCase = {
  name: 'Test 316: async net.accept',
  expect: '(record (isOk true) (value 2))',
  source: `(program
 (module (name "t316") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server)) (net.accept server))
        (case (tag "Err" (e)) (Err e))))))`
};

export const t317_async_net_read: TestCase = {
  name: 'Test 317: async net.read',
  expect: '(record (isOk true) (value "GET / HTTP/1.1\\r\\n\\r\\n"))',
  source: `(program
 (module (name "t317") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server))
          (match (net.accept server)
            (case (tag "Ok" (client)) (net.read client))
            (case (tag "Err" (e)) (Err e))))
        (case (tag "Err" (e)) (Err e))))))`
};

export const t318_async_net_write: TestCase = {
  name: 'Test 318: async net.write',
  expect: '(record (isOk true) (value 1))',
  source: `(program
 (module (name "t318") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server))
          (match (net.accept server)
            (case (tag "Ok" (client)) (net.write client "hello"))
            (case (tag "Err" (e)) (Err e))))
        (case (tag "Err" (e)) (Err e))))))`
};

export const t319_async_net_close: TestCase = {
  name: 'Test 319: async net.close',
  expect: '(record (isOk true) (value true))',
  source: `(program
 (module (name "t319") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Bool Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server)) (net.close server))
        (case (tag "Err" (e)) (Err e))))))`
};

export const t320_async_net_connect: TestCase = {
  name: 'Test 320: async net.connect',
  expect: '(record (isOk true) (value 3))',
  source: `(program
 (module (name "t320") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.connect "example.com" 80))))`
};

export const t321_async_sys_self: TestCase = {
  name: 'Test 321: async sys.self',
  expect: '1',
  source: `(program
 (module (name "t321") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (sys.self))))`
};

export const t322_async_sys_spawn: TestCase = {
  name: 'Test 322: async sys.spawn',
  expect: '1',
  source: `(program
 (module (name "t322") (version 0))
 (defs
  (deffn (name child)
    (args)
    (ret I64)
    (eff !Pure)
    (body 0))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (sys.spawn "child"))))`
};

export const t323_async_sys_send: TestCase = {
  name: 'Test 323: async sys.send',
  expect: 'true',
  source: `(program
 (module (name "t323") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body
      (let (pid (sys.self))
        (sys.send pid "hello"))))`
};

export const t324_async_sys_recv: TestCase = {
  name: 'Test 324: async sys.recv',
  expect: '"hello"',
  source: `(program
 (module (name "t324") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body
      (let (pid (sys.self))
        (let (sent (sys.send pid "hello"))
          (sys.recv)))))`
};

export const t325_async_sys_sleep: TestCase = {
  name: 'Test 325: async sys.sleep',
  expect: 'true',
  source: `(program
 (module (name "t325") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Net)
    (body (sys.sleep 10))))`
};

export const t326_async_http_parse_request: TestCase = {
  name: 'Test 326: async http.parse_request',
  expect: '(record (isOk true) (value (record (method "GET") (path "/") (headers (list)) (body ""))))',
  source: `(program
 (module (name "t326") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (method Str) (path Str) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Pure)
    (body (http.parse_request "GET / HTTP/1.1\\r\\n\\r\\n"))))`
};

export const t327_async_http_parse_response: TestCase = {
  name: 'Test 327: async http.parse_response',
  expect: '(record (isOk true) (value (record (version "HTTP/1.1") (status 200) (headers (list)) (body ""))))',
  source: `(program
 (module (name "t327") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Pure)
    (body (http.parse_response "HTTP/1.1 200 OK\\r\\n\\r\\n"))))`
};

export const t328_async_http_get: TestCase = {
  name: 'Test 328: async http.get',
  expect: '(record (isOk true) (value (record (version "HTTP/1.1") (status 200) (headers (list)) (body ""))))',
  source: `(program
 (module (name "t328") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Net)
    (body (http.get "http://example.com")))`
};

export const t329_async_http_post: TestCase = {
  name: 'Test 329: async http.post',
  expect: '(record (isOk true) (value (record (version "HTTP/1.1") (status 200) (headers (list)) (body ""))))',
  source: `(program
 (module (name "t329") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Net)
    (body (http.post "http://example.com" "data")))`
};

export const t330_async_io_read_file: TestCase = {
  name: 'Test 330: async io.read_file',
  expect: '(record (isOk true) (value "content"))',
  source: `(program
 (module (name "t330") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "test.txt"))))`,
  fs: { 'test.txt': 'content' }
};

export const t331_async_io_write_file: TestCase = {
  name: 'Test 331: async io.write_file',
  expect: '(record (isOk true) (value 7))',
  source: `(program
 (module (name "t331") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !IO)
    (body (io.write_file "output.txt" "content"))))`,
  fs: {}
};

export const t332_async_io_file_exists: TestCase = {
  name: 'Test 332: async io.file_exists',
  expect: 'true',
  source: `(program
 (module (name "t332") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !IO)
    (body (io.file_exists "test.txt"))))`,
  fs: { 'test.txt': 'content' }
};

export const t333_async_io_read_dir: TestCase = {
  name: 'Test 333: async io.read_dir',
  expect: '(record (isOk true) (value (list "file1.txt" "file2.txt")))',
  source: `(program
 (module (name "t333") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (List Str) Str))
    (eff !IO)
    (body
      (match (io.read_dir ".")
        (case (tag "Ok" (files)) (Ok files))
        (case (tag "Err" (e)) (Err e)))))`,
  fs: {
    'file1.txt': 'content1',
    'file2.txt': 'content2'
  }
};

export const t334_async_io_print: TestCase = {
  name: 'Test 334: async io.print',
  expect: '0',
  source: `(program
 (module (name "t334") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !IO)
    (body (io.print "hello"))))`,
  expectOutput: ['hello']
};

export const t335_async_cross_module_call: TestCase = {
  name: 'Test 335: async cross-module call',
  expect: '30',
  source: `(program
 (module (name "t335") (version 0))
 (imports (import (path "module_a") (alias "a")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call a.add 10 20))))`,
  modules: {
    'module_a': `(program
 (module (name "a") (version 0))
 (defs
  (deffn (name add)
    (args (x I64) (y I64))
    (ret I64)
    (eff !Pure)
    (body (+ x y)))))`
  }
};

export const t336_async_map_value_to_key: TestCase = {
  name: 'Test 336: async map valueToKey I64',
  expect: '(Some 42)',
  source: `(program
 (module (name "t336") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make))
        (let (m2 (map.put m 42 100))
          (map.get m2 42)))))`
};

export const t337_async_map_value_to_key_str: TestCase = {
  name: 'Test 337: async map valueToKey Str',
  expect: '(Some 100)',
  source: `(program
 (module (name "t337") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make))
        (let (m2 (map.put m "key" 100))
          (map.get m2 "key")))))`
};

export const t338_async_map_keys: TestCase = {
  name: 'Test 338: async map.keys',
  expect: '(list 42 "key")',
  source: `(program
 (module (name "t338") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List (Union (tag "I64" I64) (tag "Str" Str))))
    (eff !Pure)
    (body
      (let (m (map.make))
        (let (m2 (map.put m 42 1))
          (let (m3 (map.put m2 "key" 2))
            (map.keys m3))))))`
};

export const t339_async_unknown_intrinsic: TestCase = {
  name: 'Test 339: async unknown intrinsic',
  expect: 'RuntimeError: Unknown intrinsic',
  source: `(program
 (module (name "t339") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (unknown.op))))`
};

export const t340_async_i64_from_string_empty: TestCase = {
  name: 'Test 340: async i64.from_string empty string',
  expect: 'RuntimeError: i64.from_string: empty string',
  source: `(program
 (module (name "t340") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (i64.from_string ""))))`
};

export const t341_async_i64_to_string_bigint: TestCase = {
  name: 'Test 341: async i64.to_string with bigint',
  expect: '"42"',
  source: `(program
 (module (name "t341") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body (i64.to_string 42))))`
};

export const t342_async_equality_bigint_string: TestCase = {
  name: 'Test 342: async equality with bigint and string',
  expect: 'false',
  source: `(program
 (module (name "t342") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (= 42 "42"))))`
};

export const t343_async_math_type_error: TestCase = {
  name: 'Test 343: async math type error',
  expect: 'RuntimeError: Math expects I64',
  source: `(program
 (module (name "t343") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ "hello" 1))))`
};

export const t344_async_bool_and_error: TestCase = {
  name: 'Test 344: async bool && error',
  expect: 'RuntimeError: && expects Bool',
  source: `(program
 (module (name "t344") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (&& 42 true))))`
};

export const t345_async_bool_or_error: TestCase = {
  name: 'Test 345: async bool || error',
  expect: 'RuntimeError: || expects Bool',
  source: `(program
 (module (name "t345") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (|| false 42))))`
};

export const t346_async_not_error: TestCase = {
  name: 'Test 346: async ! error',
  expect: 'RuntimeError: ! expects Bool',
  source: `(program
 (module (name "t346") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (! 42))))`
};

export const t347_async_sys_spawn_error: TestCase = {
  name: 'Test 347: async sys.spawn error',
  expect: 'RuntimeError: sys.spawn expects function name',
  source: `(program
 (module (name "t347") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (sys.spawn 42))))`
};

export const t348_async_sys_send_error: TestCase = {
  name: 'Test 348: async sys.send error',
  expect: 'RuntimeError: sys.send expects',
  source: `(program
 (module (name "t348") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (sys.send "not_pid" "msg"))))`
};

export const t349_async_net_listen_error: TestCase = {
  name: 'Test 349: async net.listen error',
  expect: 'RuntimeError: net.listen expects I64',
  source: `(program
 (module (name "t349") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.listen "not_number"))))`
};

export const t350_async_net_accept_error: TestCase = {
  name: 'Test 350: async net.accept error',
  expect: 'RuntimeError: net.accept expects I64',
  source: `(program
 (module (name "t350") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.accept "not_number"))))`
};

export const t351_async_net_read_error: TestCase = {
  name: 'Test 351: async net.read error',
  expect: 'RuntimeError: net.read expects I64',
  source: `(program
 (module (name "t351") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Net)
    (body (net.read "not_number"))))`
};

export const t352_async_net_write_error: TestCase = {
  name: 'Test 352: async net.write error',
  expect: 'RuntimeError: net.write expects',
  source: `(program
 (module (name "t352") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.write "not_number" "data"))))`
};

export const t353_async_net_close_error: TestCase = {
  name: 'Test 353: async net.close error',
  expect: 'RuntimeError: net.close expects I64',
  source: `(program
 (module (name "t353") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Bool Str))
    (eff !Net)
    (body (net.close "not_number"))))`
};

export const t354_async_net_connect_error: TestCase = {
  name: 'Test 354: async net.connect error',
  expect: 'RuntimeError: net.connect expects',
  source: `(program
 (module (name "t354") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.connect 42 80))))`
};

export const t355_async_http_parse_request_error: TestCase = {
  name: 'Test 355: async http.parse_request error',
  expect: '(record (isOk false) (value "Empty request"))',
  source: `(program
 (module (name "t355") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (method Str) (path Str) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Pure)
    (body (http.parse_request ""))))`
};

export const t356_async_http_parse_response_error: TestCase = {
  name: 'Test 356: async http.parse_response error',
  expect: '(record (isOk false) (value "Empty response"))',
  source: `(program
 (module (name "t356") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Pure)
    (body (http.parse_response ""))))`
};

export const t357_async_io_read_file_not_found: TestCase = {
  name: 'Test 357: async io.read_file not found',
  expect: '(record (isOk false) (value "ENOENT"))',
  source: `(program
 (module (name "t357") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "nonexistent.txt"))))`,
  fs: {}
};

export const t358_async_io_read_dir_not_supported: TestCase = {
  name: 'Test 358: async io.read_dir not supported',
  expect: '(record (isOk false) (value "Not supported"))',
  source: `(program
 (module (name "t358") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (List Str) Str))
    (eff !IO)
    (body (io.read_dir "."))))`,
  fs: {}
};

export const t359_async_io_print_other_types: TestCase = {
  name: 'Test 359: async io.print other types',
  expect: '0',
  source: `(program
 (module (name "t359") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !IO)
    (body (io.print (Some 42)))))`,
  expectOutput: ['{"kind":"Option","value":{"kind":"I64","value":"42"}}']
};

export const t360_async_cross_module_diagnostic: TestCase = {
  name: 'Test 360: async cross-module diagnostic',
  expect: '30',
  source: `(program
 (module (name "t360") (version 0))
 (imports (import (path "lexer") (alias "lexer")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body 30)))`,
  modules: {
    'lexer': `(program
 (module (name "lexer") (version 0))
 (defs
  (deffn (name tokenize)
    (args (input Str))
    (ret (List (Record (kind Str) (value Str))))
    (eff !Pure)
    (body (list))))`
  }
};


