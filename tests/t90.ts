import { TestCase } from '../src/test-types';

export const t90: TestCase = {
    name: 'T90: Basic Import',
    source: `
(program
  (module (name "t90") (version 0))
  (imports
    (import "lib" (as "Lib")))
  (defs
    (deffn (name main)
      (args)
      (ret I64)
      (eff !Pure)
      (body (call Lib.add 1 2)))))
`,
    // We need to provide the 'lib' module somehow.
    // The current test runner doesn't support auxiliary modules yet.
    // We might need to extend the Test interface or the runner.
    expect: '3',
    modules: {
        "lib": `
(program
  (module (name "lib") (version 0))
  (defs
    (deffn (name add)
      (args (a I64) (b I64))
      (ret I64)
      (eff !Pure)
      (body (+ a b)))))
`
    }
};
