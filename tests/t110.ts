import { TestCase } from '../src/test-types';

export const t110: TestCase = {
    name: 'Test 110: HTTP Parse Request',
    expect: '(Ok (record (body "") (headers (list (record (key "Host") (val "localhost")) (record (key "User-Agent") (val "Iris")))) (method "GET") (path "/")))',
    source: `
(program
  (module (name "t110") (version 0))
  (defs
    (deffn (name main) (args) (ret (Result (Record (method Str) (path Str) (headers (List (Record (key Str) (val Str)))) (body Str)) Str)) (eff !Pure)
      (body 
        (http.parse_request "GET / HTTP/1.1\\r\\nHost: localhost\\r\\nUser-Agent: Iris\\r\\n\\r\\n")
      )
    )
  )
)`
};
