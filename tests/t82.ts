import { TestCase } from '../src/test-types';

export const t82: TestCase = {
    name: 'Test 82: Enforce bare None',
    expect: 'TypeError: Unknown function call: None',
    source: '(program ' +
        ' (module (name "t82") (version 0)) ' +
        ' (defs ' +
        '  (deffn (name main) ' +
        '    (args) ' +
        '    (ret (Option I64)) ' +
        '    (eff !Pure) ' +
        '    (body (None)))))'
};
