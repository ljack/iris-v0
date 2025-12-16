import { TestCase } from '../src/test-types';

export const t100: TestCase = {
    name: 'Test 100: IO write file',
    expect: '(Ok 5)', // length of "hello"
    fs: {},
    source: '(program (module (name "t100") (version 0)) (defs (deffn (name main) (args) (ret (Result I64 Str)) (eff !IO) (body (io.write_file "out.txt" "hello")))))'
};

export const t101: TestCase = {
    name: 'Test 101: IO file exists',
    expect: 'true',
    fs: { "data.txt": "exist" },
    source: '(program (module (name "t101") (version 0)) (defs (deffn (name main) (args) (ret Bool) (eff !IO) (body (io.file_exists "data.txt")))))'
};

export const t102: TestCase = {
    name: 'Test 102: IO file does not exist',
    expect: 'false',
    source: '(program (module (name "t102") (version 0)) (defs (deffn (name main) (args) (ret Bool) (eff !IO) (body (io.file_exists "ghost.txt")))))'
};

export const t103: TestCase = {
    name: 'Test 103: Net listen mock',
    expect: '(Ok 1)',
    source: '(program (module (name "t103") (version 0)) (defs (deffn (name main) (args) (ret (Result I64 Str)) (eff !Net) (body (net.listen 8080)))))'
};

export const t104: TestCase = {
    name: 'Test 104: !Net allows !IO calls',
    expect: '(Ok 5)',
    source: '(program (module (name "t104") (version 0)) (defs (deffn (name do_io) (args) (ret (Result I64 Str)) (eff !IO) (body (io.write_file "log.txt" "hello"))) (deffn (name main) (args) (ret (Result I64 Str)) (eff !Net) (body (call do_io)))))'
};

export const t105: TestCase = {
    name: 'Test 105: !IO cannot call !Net',
    expect: 'TypeError: EffectMismatch: Function main: Inferred !Net but declared !IO',
    source: '(program (module (name "t105") (version 0)) (defs (deffn (name main) (args) (ret (Result I64 Str)) (eff !IO) (body (net.listen 80)))))'
};
