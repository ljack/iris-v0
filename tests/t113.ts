import { TestCase } from '../src/test-types';

export const t113: TestCase = {
  name: 'Test 113: Static File Server Logic',
  expect: '(Ok "HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n<html></html>")',
  modules: {},
  source: `
(program
  (module (name "t113") (version 0))
  (defs
    (deffn (name get_content_type) (args (path Str)) (ret Str) (eff !Pure)
      (body 
        (if (str.ends_with path ".html") "text/html"
        (if (str.ends_with path ".css") "text/css"
        (if (str.ends_with path ".js") "application/javascript"
        "text/plain")))
      )
    )

    (deffn (name serve_file) (args (path Str)) (ret (Result Str Str)) (eff !IO)
      (body 
        (if (str.contains path "..") (Ok "Error: Forbidden")
        (let (full_path (str.concat "./public" path))
        (if (io.file_exists full_path)
           (match (io.read_file full_path)
             (case (tag "Ok" (content))
                (let (ctype (get_content_type path))
                (let (header1 (str.concat "HTTP/1.1 200 OK\\r\\nContent-Type: " ctype))
                (let (header2 (str.concat header1 "\\r\\n\\r\\n"))
                (Ok (str.concat header2 content))))))
             (case (tag "Err" (e)) (Ok (str.concat "Error: " e))))
           (Ok "Error: Not Found"))))
      )
    )

    (deffn (name main) (args) (ret (Result Str Str)) (eff !IO)
      (body 
        (let (w (io.write_file "./public/index.html" "<html></html>"))
        (serve_file "/index.html"))
      )
    )
  )
)`
};
