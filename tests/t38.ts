import { TestCase } from '../src/test-types';

const depth = 100;
let s = "";
for (let i = 0; i < depth; i++) s += "(+ 1 ";
s += "10";
for (let i = 0; i < depth; i++) s += ")";

export const t38: TestCase = {
  name: 'Test 38: Deeply Nested Expression',
  expect: (depth + 10).toString(),
  source: '(program ' +
    ' (module (name "t38") (version 0)) ' +
    ' (defs ' +
    '  (deffn (name main) ' +
    '    (args) (ret I64) (eff !Pure) ' +
    '    (body ' + s + '))))'
};
