import { TestCase } from '../src/test-types';

export const t112: TestCase = {
    name: 'Test 112: Modular HTTP Server',
    expect: '(Ok 0)',
    modules: {
        "http": `(program (module (name "http") (version 0)) (defs
            (deffn (name response_ok) (args (body Str) (valid Bool)) (ret Str) (eff !Pure)
               (body (if valid
                  "HTTP/1.1 200 OK\\r\\nContent-Length: 5\\r\\n\\r\\nHELLO"
                  "HTTP/1.1 404 Not Found\\r\\n\\r\\n")))
        ))`,
        // Helpers module? No, just http.
    },
    source: `
(program
  (module (name "t112") (version 0))
  (imports (import "http" (as "Http")))
  (defs
    (deffn (name main) (args) (ret (Result I64 Str)) (eff !Net)
      (body 
        (let (conn_res (net.accept 8081))
        (match conn_res
          (case (tag "Ok" (conn))
            (let (read_res (net.read conn))
            (match read_res
              (case (tag "Ok" (data))
                 (let (parse_res (http.parse_request data))
                 (match parse_res
                   (case (tag "Ok" (req))
                      (let (resp (call Http.response_ok "HELLO" true))
                      (let (w (net.write conn resp))
                      (let (c (net.close conn))
                      (Ok 0)))))
                   (case (tag "Err" (e)) (Err e)))))
              (case (tag "Err" (e)) (Err e)))))
          (case (tag "Err" (e)) (Err e))))
      )
    )
  )
)`
};
