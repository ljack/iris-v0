import { TestCase } from '../src/test-types';

export const t106: TestCase = {
    name: 'Test 106: Circular Import Detection',
    expect: 'RuntimeError: In module \'modA\': In module \'modB\': Circular import detected: modA -> modB -> modA', // Expected behavior after fix
    modules: {
        "modA": '(program (module (name "modA") (version 0)) (imports (import "modB" (as "B"))) (defs (deffn (name foo) (args) (ret I64) (eff !Pure) (body (call B.bar)))))',
        "modB": '(program (module (name "modB") (version 0)) (imports (import "modA" (as "A"))) (defs (deffn (name bar) (args) (ret I64) (eff !Pure) (body (call A.foo)))))'
    },
    source: '(program (module (name "t106") (version 0)) (imports (import "modA" (as "A"))) (defs (deffn (name main) (args) (ret I64) (eff !Pure) (body (call A.foo)))))'
};
