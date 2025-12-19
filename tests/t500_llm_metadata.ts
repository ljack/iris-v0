import { TestCase } from '../src/test-types';

export const t500_llm_metadata: TestCase = {
  name: 'Test 500: LLM metadata syntax',
  source: `
(program
  (module (name "t500") (version 0))
  (defs
    (deftype User (record (id I64) (name Str))
      (doc "User record"))
    (deftype Status (union (tag "Ok" (Str)) (tag "Err" (Str)))
      (doc "Result-like status"))
    (deftool (name http_get)
      (args (url Str))
      (ret Str)
      (eff !Net)
      (doc "HTTP GET tool")
      (caps (net Net)))
    (deffn (name main)
      (args)
      (ret I64)
      (eff !Pure)
      (doc "entry")
      (requires "no side effects")
      (ensures "returns 0")
      (body 0))))
`,
  expect: '0'
};
