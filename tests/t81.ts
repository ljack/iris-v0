import { TestCase } from '../src/test-types';

export const t81: TestCase = {
    name: 'Test 81: Read empty file',
    expect: '(Ok "")',
    fs: { "/e.txt": "" },
    source: '(program ' +
        ' (module (name "t81") (version 0)) ' +
        ' (defs ' +
        '  (deffn (name main) ' +
        '    (args) ' +
        '    (ret (Result Str Str)) ' +
        '    (eff !IO) ' +
        '    (body (io.read_file "/e.txt")))))'
};
