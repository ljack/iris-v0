import { TestCase } from '../src/test-types';

// Tests for async evaluation paths
// Part 2: System, Network, and HTTP Intrinsics

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
