
import { TestCase } from '../src/test-types';
import { evalExprSync } from '../src/eval/sync';
import { Expr, Value, Program } from '../src/types';
import { Interpreter } from '../src/eval/interpreter';

// Helper to create interpreter
function createInterp(): Interpreter {
    const prog: Program = {
        module: { name: 'test_sync_cov', version: 1 },
        imports: [],
        defs: []
    };
    const interp = new Interpreter(prog);
    // Mock args for sys.args test
    interp.args = ['arg1', 'arg2'];
    return interp;
}

export const t392_sync_coverage: TestCase = {
    name: 'Test 392: Sync Eval Coverage',
    fn: async () => {
        const interp = createInterp();

        // 1. Async Intrinsic in Sync Context (sys.sleep)
        try {
            const expr: Expr = { kind: 'Intrinsic', op: 'sys.sleep', args: [{ kind: 'Literal', value: { kind: 'I64', value: 10n } }] };
            evalExprSync(interp, expr);
            throw new Error("Should have thrown error for sys.sleep in sync");
        } catch (e: any) {
            if (!e.message.includes('Cannot call async intrinsic')) throw new Error("Wrong error for sys.sleep: " + e.message);
        }

        // 2. sys.args
        const argsExpr: Expr = { kind: 'Intrinsic', op: 'sys.args', args: [] };
        const argsRes = evalExprSync(interp, argsExpr);
        if (argsRes.kind !== 'List' || argsRes.items.length !== 2) throw new Error("sys.args failed");
        if (argsRes.items[0].kind === 'Str' && argsRes.items[0].value !== 'arg1') throw new Error("sys.args[0] value mismatch");

        // 3. Unknown Expr Kind
        try {
            const expr: any = { kind: 'UnknownKind' };
            evalExprSync(interp, expr);
            throw new Error("Should have thrown for unknown expr kind");
        } catch (e: any) {
            if (!e.message.includes('Unimplemented evalSync')) throw new Error("Wrong error for unknown expr kind: " + e.message);
        }

        // 4. Match Tuple as Tagged Union
        // Target: Tuple("MyTag", 123)
        // Case: Tag "MyTag", vars: ["x"]
        const tupleTarget: Expr = {
            kind: 'Literal',
            value: {
                kind: 'Tuple',
                items: [
                    { kind: 'Str', value: 'MyTag' },
                    { kind: 'I64', value: 123n }
                ]
            }
        };
        const matchExpr: Expr = {
            kind: 'Match',
            target: tupleTarget,
            cases: [
                {
                    tag: 'MyTag',
                    vars: { kind: 'List', items: [{ kind: 'Str', value: 'val' }] } as any,
                    body: { kind: 'Var', name: 'val' }
                }
            ]
        };
        const matchRes = evalExprSync(interp, matchExpr);
        if (matchRes.kind !== 'I64' || matchRes.value !== 123n) throw new Error("Match Tuple as Tagged Union failed");

        // 5. Call Intrinsic via Call node (not Intrinsic node)
        // This hits the `if (!func) { return evalIntrinsicSync(...) }` path in Call case
        const callExpr: Expr = {
            kind: 'Call',
            fn: 'i64.to_string',
            args: [{ kind: 'Literal', value: { kind: 'I64', value: 42n } }]
        };
        const callRes = evalExprSync(interp, callExpr);
        if (callRes.kind !== 'Str' || callRes.value !== '42') throw new Error("Call intrinsic failed");

        // 6. Sync Variable Lookup Deep (Parent Env)
        // Need to nest envs: parent has 'a', child has nothing. Access 'a.x'.
        const parentEnv = { name: 'a', value: { kind: 'Record', fields: { x: { kind: 'I64', value: 1n } } } as Value, parent: undefined };
        const childEnv = { name: 'dummy', value: { kind: 'I64', value: 0n } as Value, parent: parentEnv };
        const deepVarExpr: Expr = { kind: 'Var', name: 'a.x' };
        const deepRes = evalExprSync(interp, deepVarExpr, childEnv);
        if (deepRes.kind !== 'I64' || deepRes.value !== 1n) throw new Error("Sync deep var lookup failed");

        // 7. Sync Invalid Dot Access (on I64)
        try {
            const env = { name: 'x', value: { kind: 'I64', value: 10n } as Value, parent: undefined };
            evalExprSync(interp, { kind: 'Var', name: 'x.y' }, env);
            throw new Error("Should have thrown for dot access on I64");
        } catch (e: any) {
            if (!e.message.includes('Cannot access field')) throw new Error("Wrong error for invalid dot access: " + e.message);
        }

        // 8. Sync Unknown Variable
        try {
            evalExprSync(interp, { kind: 'Var', name: 'unknown_var' });
            throw new Error("Should have thrown for unknown variable");
        } catch (e: any) {
            if (!e.message.includes('Unknown variable')) throw new Error("Wrong error for unknown variable: " + e.message);
        }
    }
};
