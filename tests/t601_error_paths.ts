import { check, run } from '../src/main';
import { TestCase } from '../src/test-types';

export const t601_error_paths: TestCase = {
    name: 'Test 601: check/run error propagation edge cases',
    fn: async () => {
        const parseResult = check('@');
        if (parseResult.success) {
            throw new Error('Parse case should fail');
        }
        if (parseResult.error !== "ParseError: Expected LParen at 1:1, got Symbol '@'") {
            throw new Error(`Parse error mismatch: ${parseResult.error}`);
        }

        const circularModules = {
            modA: '(program (module (name "modA") (version 0)) (imports (import "modB" (as "B"))) (defs (deffn (name a) (args) (ret I64) (eff !Pure) (body (call B.b)))))',
            modB: '(program (module (name "modB") (version 0)) (imports (import "modA" (as "A"))) (defs (deffn (name b) (args) (ret I64) (eff !Pure) (body (call A.a)))))'
        };
        const circularMain = [
            '(program (module (name "main") (version 0))',
            '  (imports (import "modA" (as "A")))',
            '  (defs (deffn (name main) (args) (ret I64) (eff !Pure)',
            '      (body (call A.a))))',
            ')'
        ].join(' ');
        const circularResult = await run(circularMain, {}, circularModules);
        if (circularResult !== "RuntimeError: In module 'modA': In module 'modB': Circular import detected: modA -> modB -> modA") {
            throw new Error(`Circular import error mismatch: ${circularResult}`);
        }

        const typeSource = '(program (module (name "typefail") (version 0)) (imports) (defs (deffn (name main) (args) (ret I64) (eff !Pure) (body (match (Some 1) (case (tag "Some") 0) (case (tag "None") 1))))))';
        const typeResult = check(typeSource);
        if (typeResult.success) {
            throw new Error('Type error case should fail');
        }
        if (typeResult.error !== 'TypeError: Some case expects 1 variable') {
            throw new Error(`Type error mismatch: ${typeResult.error}`);
        }
    }
};
