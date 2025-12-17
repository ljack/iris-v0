import { TestCase } from '../src/test-types';

const SOURCE = `
(program
  (module (name "io_readdir") (version 0))
  (defs
    (deffn (name main) (args) (ret (List Str)) (eff !IO)
      (body
        (let (res (io.read_dir "."))
          (match res
            (case (tag "Ok" (list)) list)
            (case (tag "Err" (msg)) (list))
          )
        )
      )
    )
  )
)
`;

export const t131: TestCase = {
    name: 'IO Read Dir',
    source: SOURCE,
    fs: { "a": "1", "b": "2" },
    expect: "(list \"a\" \"b\")"
};
