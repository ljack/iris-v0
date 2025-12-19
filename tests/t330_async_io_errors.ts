import { TestCase } from '../src/test-types';

// Tests for async evaluation paths
// Part 3: IO, Module Calls, Maps, Intrinsic Errors, and misc.

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
