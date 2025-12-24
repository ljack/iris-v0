import { TestCase } from '../src/test-types';

export const t107: TestCase = {
    name: 'Test 107: Cross-module type mismatch',
    expect: 'TypeError: Argument 1 mismatch: Expected I64, got Str',
    // Exact message may vary depending on existing logic, verifying behavior.
    modules: {
        "lib": '(program (module (name "lib") (version 0)) (defs (deffn (name add) (args (a I64) (b I64)) (ret I64) (eff !Pure) (body (+ a b)))))'
    },
    source: '(program (module (name "t107") (version 0)) (imports (import "lib" (as "Lib"))) (defs (deffn (name main) (args) (ret I64) (eff !Pure) (body (Lib.add 1 "2")))))'
};

export const t108: TestCase = {
    name: 'Test 108: Cross-module effect mismatch',
    expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
    modules: {
        "logger": '(program (module (name "logger") (version 0)) (defs (deffn (name log) (args (msg Str)) (ret I64) (eff !IO) (body (io.write_file "log.txt" msg)))))'
    },
    source: '(program (module (name "t108") (version 0)) (imports (import "logger" (as "Logger"))) (defs (deffn (name main) (args) (ret I64) (eff !Pure) (body (Logger.log "test")))))'
};
