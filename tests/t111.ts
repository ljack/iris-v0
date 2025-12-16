import { TestCase } from '../src/test-types';

export const t111: TestCase = {
    name: 'Test 111: Server Request Cycle',
    expect: '(Ok 1)',
    source: `(program
  (module (name "t111") (version 0))
  (defs
    (deffn (name handle_client) (args (conn I64)) (ret (Result I64 Str)) (eff !Net)
      (body 
        (let (read_res (net.read conn))
          (match read_res
            (case (tag "Ok" (data))
              (let (parse_res (http.parse_request data))
                (match parse_res
                  (case (tag "Ok" (req))
                    (let (resp "HTTP/1.1 200 OK\\r\\n\\r\\nHello")
                      (let (write_res (net.write conn resp))
                        (let (close_res (net.close conn))
                          (Ok 1)))))
                  (case (tag "Err" (msg))
                    (Err msg)))))
            (case (tag "Err" (msg))
              (Err msg))))))

    (deffn (name main) (args) (ret (Result I64 Str)) (eff !Net)
      (body 
        (let (conn_res (net.accept 1234))
          (match conn_res
            (case (tag "Ok" (conn))
              (call handle_client conn))
            (case (tag "Err" (e))
              (Err e))))))))`
};
