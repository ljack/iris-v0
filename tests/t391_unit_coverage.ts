
import { TestCase } from '../src/test-types';
import { checkLiteral } from '../src/typecheck/checks/literal';
import { evalConstructor } from '../src/eval/ops/constructors';
import { evalExpr } from '../src/eval/expr';
import { Expr, Value, IrisType, Program, Definition } from '../src/types';
import { IInterpreter } from '../src/eval/interfaces';
import { Interpreter } from '../src/eval/interpreter';

// Mock context for type checking
const mockCtx: any = {
    // Add necessary context mocks if needed
};

// Mock Interpreter
const mockInterp: IInterpreter = {
    program: { module: { name: 'test', version: 1 }, imports: [], defs: [] },
    functions: new Map(),
    constants: new Map(),
    fs: {
        readFile: () => null,
        writeFile: () => false,
        exists: () => false
    },
    net: {
        listen: async () => null,
        accept: async () => null,
        read: async () => null,
        write: async () => false,
        close: async () => false,
        connect: async () => null
    },
    pid: 1,
    args: [],
    callFunction: async () => ({ kind: 'I64', value: 0n }),
    spawn: () => 1,
    getInterpreter: () => undefined,
    createInterpreter: () => mockInterp
};

// Helper for checkLiteral tests
function testCheckLiteral() {
    console.log('Testing checkLiteral coverage...');
    const env = new Map<string, IrisType>();

    // 1. Literal Option with value (Some)
    try {
        const expr: Expr = { kind: 'Literal', value: { kind: 'Option', value: { kind: 'I64', value: 10n } } };
        checkLiteral((_ctx, e, _env) => ({ type: { type: 'I64' }, eff: '!Pure' }), mockCtx, expr, env);
    } catch (e) {
        console.error('Failed Option test:', e);
        throw e;
    }

    // 2. Literal Result (Ok)
    try {
        const expr: Expr = { kind: 'Literal', value: { kind: 'Result', isOk: true, value: { kind: 'I64', value: 10n } } };
        checkLiteral((_ctx, e, _env) => ({ type: { type: 'I64' }, eff: '!Pure' }), mockCtx, expr, env);
    } catch (e) {
        console.error('Failed Result Ok test:', e);
        throw e;
    }

    // 3. Literal Result (Err)
    try {
        const expr: Expr = { kind: 'Literal', value: { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Error" } } };
        checkLiteral((_ctx, e, _env) => ({ type: { type: 'Str' }, eff: '!Pure' }), mockCtx, expr, env);
    } catch (e) {
        console.error('Failed Result Err test:', e);
        throw e;
    }

    // 4. Literal List (Empty, Explicit Type)
    try {
        const expr: Expr = { kind: 'Literal', value: { kind: 'List', items: [] } };
        const expected: IrisType = { type: 'List', inner: { type: 'Str' } };
        const res = checkLiteral((_ctx, e, _env) => ({ type: { type: 'I64' }, eff: '!Pure' }), mockCtx, expr, env, expected);
        if (res.type.type !== 'List' || (res.type.inner as any).type !== 'Str') throw new Error("List type mismatch");
    } catch (e) {
        console.error('Failed List explicit type test:', e);
        throw e;
    }

    // 5. Literal Tuple
    try {
        const expr: Expr = { kind: 'Literal', value: { kind: 'Tuple', items: [] } };
        checkLiteral((_ctx, e, _env) => ({ type: { type: 'I64' }, eff: '!Pure' }), mockCtx, expr, env);
    } catch (e) {
        console.error('Failed Tuple test:', e);
        throw e;
    }

    // 6. Literal Record
    try {
        const expr: Expr = { kind: 'Literal', value: { kind: 'Record', fields: {} } };
        checkLiteral((_ctx, e, _env) => ({ type: { type: 'I64' }, eff: '!Pure' }), mockCtx, expr, env);
    } catch (e) {
        console.error('Failed Record test:', e);
        throw e;
    }

    // 7. Unknown literal kind
    try {
        const expr: any = { kind: 'Literal', value: { kind: 'UnknownKind' } };
        checkLiteral((_ctx, e, _env) => ({ type: { type: 'I64' }, eff: '!Pure' }), mockCtx, expr, env);
        throw new Error("Should have thrown error for unknown literal kind");
    } catch (e: any) {
        if (!e.message.includes('Unknown literal kind')) throw new Error("Wrong error for unknown literal kind: " + e.message);
    }
}

async function testEvalExpr() {
    console.log('Testing evalExpr coverage...');

    // 1. Tagged Expression
    try {
        const expr: Expr = { kind: 'Tagged', tag: 'MyTag', value: { kind: 'Literal', value: { kind: 'I64', value: 42n } } };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'Tagged' || res.tag !== 'MyTag') throw new Error("Tagged evaluation failed");
    } catch (e) {
        console.error('Failed Tagged eval test:', e);
        throw e;
    }

    // 2. Generic Tagged Union Matching (Tuple based)
    try {
        const target: Expr = {
            kind: 'Literal',
            value: {
                kind: 'Tuple',
                items: [
                    { kind: 'Str', value: 'MyTag' },
                    { kind: 'I64', value: 10n },
                    { kind: 'Str', value: 'hello' }
                ]
            }
        };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                {
                    tag: 'MyTag',
                    vars: { kind: 'List', items: [{ kind: 'Str', value: 'x' }, { kind: 'Str', value: 'y' }] } as any,
                    body: { kind: 'Var', name: 'y' }
                }
            ]
        };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'Str' || res.value !== 'hello') throw new Error("Generic Tagged Union match failed");
    } catch (e) {
        console.error('Failed Generic Tagged Union match test:', e);
        throw e;
    }

    // 3. Match Failure
    try {
        const target: Expr = { kind: 'Literal', value: { kind: 'I64', value: 1n } };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                { tag: 'Other', vars: { kind: 'List', items: [] } as any, body: { kind: 'Literal', value: { kind: 'I64', value: 2n } } }
            ]
        };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown match failure error");
    } catch (e: any) {
        if (!e.message.includes('No matching case')) throw new Error("Wrong match failure error: " + e.message);
    }

    // 4. Default Unknown Kind
    try {
        const expr: any = { kind: 'UnknownExprKind' };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for unknown expr kind");
    } catch (e: any) {
        if (!e.message.includes('Unimplemented eval')) throw new Error("Wrong error for unknown expr kind: " + e.message);
    }

    // 5. Match Failure with BigInt (Replacer coverage)
    try {
        const target: Expr = { kind: 'Literal', value: { kind: 'I64', value: 999n } };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                { tag: 'Other', vars: { kind: 'List', items: [] } as any, body: { kind: 'Literal', value: { kind: 'I64', value: 2n } } }
            ]
        };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown match failure error with replacer");
    } catch (e: any) {
        if (!e.message.includes('No matching case') || !e.message.includes('999n')) throw new Error("Wrong match failure error (BigInt check): " + e.message);
    }

    // 6. Record Evaluation Errors
    // 6a. Invalid field tuple
    try {
        const expr: Expr = {
            kind: 'Record',
            fields: [{ kind: 'Literal', value: { kind: 'I64', value: 1n } } as any]
        };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for invalid record field tuple");
    } catch (e: any) {
        if (!e.message.includes('Invalid record field tuple')) throw new Error("Wrong error for invalid record field tuple: " + e.message);
    }

    // 6b. Invalid key
    try {
        const expr: Expr = {
            kind: 'Record',
            fields: [
                { kind: 'Literal', value: { kind: 'Tuple', items: [{ kind: 'I64', value: 1n }, { kind: 'I64', value: 2n }].map(x => ({ kind: 'Literal', value: x } as Expr)) } } as any
            ] as any
        };
        // Wait, Record fields are Expr[] where each Expr evaluates to a Tuple.
        // My manual construction above was trying to bypass type check?
        // Let's use correct Expr: Record { fields: [ Tuple(I64, I64) ] }
        const badKeyExpr: Expr = {
            kind: 'Record',
            fields: [
                {
                    kind: 'Tuple', items: [
                        { kind: 'Literal', value: { kind: 'I64', value: 1n } },
                        { kind: 'Literal', value: { kind: 'I64', value: 2n } }
                    ]
                }
            ]
        };

        // await evalExpr(mockInterp, badKeyExpr);
        // Actually Record fields are evaluated as expressions.
        // If evalExpr returns a Tuple(I64, I64), then Record logic checks if first item is Str.
        // So `badKeyExpr` above evaluates to a record with a field tuple (1, 2). 1 is I64.

        try {
            await evalExpr(mockInterp, badKeyExpr);
            throw new Error("Should have thrown error for record key must be Str");
        } catch (e: any) {
            if (!e.message.includes('Record key must be Str')) throw new Error("Wrong error for record key: " + e.message);
        }
    } catch (e) { throw e; }


    // 7. Variable Resolution Errors
    // 7a. Nested access on unknown variable
    try {
        const expr: Expr = { kind: 'Var', name: 'unknown_var.field' };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for unknown variable");
    } catch (e: any) {
        if (!e.message.includes('Runtime Unknown variable')) throw new Error("Wrong error for unknown variable: " + e.message);
    }

    // 7b. Unknown field on Record
    mockInterp.constants.set('myRecord', { kind: 'Record', fields: { 'a': { kind: 'I64', value: 1n } } });
    try {
        const expr: Expr = { kind: 'Var', name: 'myRecord.b' };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for unknown field");
    } catch (e: any) {
        if (!e.message.includes('Unknown field')) throw new Error("Wrong error for unknown field: " + e.message);
    }

    // 7c. Tuple index not a number
    mockInterp.constants.set('myTuple', { kind: 'Tuple', items: [{ kind: 'I64', value: 1n }] });
    try {
        const expr: Expr = { kind: 'Var', name: 'myTuple.notanumber' };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for Tuple index must be number");
    } catch (e: any) {
        if (!e.message.includes('Tuple index must be number')) throw new Error("Wrong error for tuple index not number: " + e.message);
    }

    // 7d. Tuple index out of bounds
    try {
        const expr: Expr = { kind: 'Var', name: 'myTuple.5' };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for Tuple index out of bounds");
    } catch (e: any) {
        if (!e.message.includes('Tuple index out of bounds')) throw new Error("Wrong error for tuple index bounds: " + e.message);
    }

    // 7e. Access on non-struct
    mockInterp.constants.set('myInt', { kind: 'I64', value: 1n });
    try {
        const expr: Expr = { kind: 'Var', name: 'myInt.field' };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for Cannot access field");
    } catch (e: any) {
        if (!e.message.includes('Cannot access field')) throw new Error("Wrong error for cannot access field: " + e.message);
    }

    // 8. If Condition Error
    try {
        const expr: Expr = {
            kind: 'If',
            cond: { kind: 'Literal', value: { kind: 'I64', value: 1n } },
            then: { kind: 'Literal', value: { kind: 'I64', value: 1n } },
            else: { kind: 'Literal', value: { kind: 'I64', value: 1n } }
        };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for If condition must be Bool");
    } catch (e: any) {
        if (!e.message.includes('If condition must be Bool')) throw new Error("Wrong error for if condition: " + e.message);
    }

    // 9. Call Arity Mismatch
    const mockFnDef: any = { args: [{ name: 'a' }], body: { kind: 'Literal', value: { kind: 'I64', value: 1n } } };
    mockInterp.functions.set('myFunc', mockFnDef);
    try {
        const expr: Expr = { kind: 'Call', fn: 'myFunc', args: [] };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for Arity mismatch");
    } catch (e: any) {
        if (!e.message.includes('Arity mismatch')) throw new Error("Wrong error for arity mismatch: " + e.message);
    }

    // 10. Unknown Function
    try {
        const expr: Expr = { kind: 'Call', fn: 'unknownFunc', args: [] };
        await evalExpr(mockInterp, expr);
        throw new Error("Should have thrown error for Unknown function");
    } catch (e: any) {
        if (!e.message.includes('Unknown function')) throw new Error("Wrong error for unknown function: " + e.message);
    }

    // 11. Match Option Some with Binding
    try {
        const target: Expr = { kind: 'Literal', value: { kind: 'Option', value: { kind: 'I64', value: 10n } } };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                {
                    tag: 'Some',
                    vars: { kind: 'List', items: [{ kind: 'Str', value: 'x' }] } as any,
                    body: { kind: 'Var', name: 'x' }
                }
            ]
        };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'I64' || res.value !== 10n) throw new Error("Match Option Some binding failed");
    } catch (e) {
        console.error('Failed Match Option Some binding:', e);
        throw e;
    }

    // 12. Match Result Err with Binding
    try {
        const target: Expr = { kind: 'Literal', value: { kind: 'Result', isOk: false, value: { kind: 'Str', value: "oops" } } };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                {
                    tag: 'Err',
                    vars: { kind: 'List', items: [{ kind: 'Str', value: 'e' }] } as any,
                    body: { kind: 'Var', name: 'e' }
                }
            ]
        };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'Str' || res.value !== "oops") throw new Error("Match Result Err binding failed");
    } catch (e) {
        console.error('Failed Match Result Err binding:', e);
        throw e;
    }

    // 13. Match Tagged with Binding
    try {
        // Fix: value must be Expr (Literal), not Value
        const target: Expr = { kind: 'Tagged', tag: 'MyTv', value: { kind: 'Literal', value: { kind: 'I64', value: 123n } } };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                {
                    tag: 'MyTv',
                    vars: { kind: 'List', items: [{ kind: 'Str', value: 'val' }] } as any,
                    body: { kind: 'Var', name: 'val' }
                }
            ]
        };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'I64' || res.value !== 123n) throw new Error("Match Tagged binding failed");
    } catch (e) {
        console.error('Failed Match Tagged binding:', e);
        throw e;
    }

    // 14. Tuple Dot Access (Valid)
    mockInterp.constants.set('validTuple', { kind: 'Tuple', items: [{ kind: 'I64', value: 99n }] });
    try {
        const expr: Expr = { kind: 'Var', name: 'validTuple.0' };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'I64' || res.value !== 99n) throw new Error("Valid Tuple dot access failed");
    } catch (e) {
        console.error('Failed Valid Tuple dot access:', e);
        throw e;
    }
}

function testEvalConstructor() {
    console.log('Testing evalConstructor coverage...');

    // Test unknown op
    try {
        evalConstructor('UnknownOp' as any, []);
        throw new Error("Should have thrown error for unknown op");
    } catch (e: any) {
        if (!e.message.includes('Unknown constructor op')) throw new Error("Wrong error for unknown constructor op: " + e.message);
    }

    // Test Ok
    const okVal = evalConstructor('Ok', [{ kind: 'I64', value: 10n }]);
    if (okVal.kind !== 'Result' || !okVal.isOk) throw new Error("Ok constructor failed");

    // Test Err
    const errVal = evalConstructor('Err', [{ kind: 'Str', value: "bad" }]);
    if (errVal.kind !== 'Result' || errVal.isOk) throw new Error("Err constructor failed");
}

async function testInterpreterCoverage() {
    console.log('Testing Interpreter coverage...');

    // 1. Init Constants
    const prog: Program = {
        module: { name: 'test_const', version: 1 },
        imports: [],
        defs: [
            { kind: 'DefConst', name: 'C1', value: { kind: 'Literal', value: { kind: 'I64', value: 100n } }, type: { type: 'I64' } }
        ]
    };
    const interp = new Interpreter(prog);
    // callFunction trigger initConstants
    interp.functions.set('test', {
        kind: 'DefFn',
        name: 'test',
        args: [],
        ret: { type: 'I64' },
        body: { kind: 'Var', name: 'C1' },
        eff: '!Pure'
    });
    const res = await interp.callFunction('test', []);
    if (res.kind !== 'I64' || res.value !== 100n) throw new Error("Interpreter constant init failed");

    // 2. Spawn crash
    const interp2 = new Interpreter(prog);
    // Mock callFunction to throw
    interp2.callFunction = async () => { throw new Error("Spawn crash test"); };
    // This is async and "fire and forget", so we can't easily await the console.error.
    // But evaluating it triggers the line.
    // Define the function before spawning to avoid "Unknown function" error
    // Mock function in program defs so spawned child finds it
    (interp2.program.defs as any).push({
        kind: 'DefFn',
        name: 'someFunc',
        args: [],
        ret: { type: 'I64' }, // Dummy
        eff: '!Pure',
        body: { kind: 'Literal', value: { kind: 'I64', value: 1n } }
    });
    // Re-init functions map for interp2 just in case, though spawn creates new one
    interp2.functions.set('someFunc', {
        kind: 'DefFn',
        name: 'someFunc',
        args: [],
        body: { kind: 'Literal', value: { kind: 'I64', value: 1n } }
    } as any);
    interp2.spawn('someFunc');
    // Short wait to allow promise to reject and catch block to run
    await new Promise(r => setTimeout(r, 10));
    // 3. Init Constants Coverage (Double Init)
    await interp.callFunction('test', []); // Second call triggers implicit double init check (return early)

    // 4. Expr Match nil mismatch
    try {
        const target: Expr = { kind: 'Literal', value: { kind: 'List', items: [{ kind: 'I64', value: 1n }] } };
        const expr: Expr = {
            kind: 'Match',
            target: target,
            cases: [
                { tag: 'nil', vars: { kind: 'List', items: [] } as any, body: { kind: 'Literal', value: { kind: 'I64', value: 999n } } },
                { tag: 'cons', vars: { kind: 'List', items: [{ kind: 'Str', value: 'h' }, { kind: 'Str', value: 't' }] } as any, body: { kind: 'Literal', value: { kind: 'I64', value: 1n } } }
            ]
        };
        const res = await evalExpr(mockInterp, expr);
        if (res.kind !== 'I64' || res.value !== 1n) throw new Error("Match mismatch nil -> cons failed");
    } catch (e) {
        console.error('Failed Match nil mismatch:', e);
        throw e;
    }
}

function testInterpreterSyncCoverage() {
    console.log('Testing Interpreter Sync coverage...');
    const prog: Program = {
        module: { name: 'test_sync', version: 1 },
        imports: [],
        defs: [
            { kind: 'DefConst', name: 'C2', value: { kind: 'Literal', value: { kind: 'I64', value: 200n } }, type: { type: 'I64' } }
        ]
    };
    const interp = new Interpreter(prog);

    // 1. callFunctionSync constants init
    interp.functions.set('testSync', {
        kind: 'DefFn',
        name: 'testSync',
        args: [],
        ret: { type: 'I64' },
        body: { kind: 'Var', name: 'C2' },
        eff: '!Pure'
    });

    const res = interp.callFunctionSync('testSync', []);
    if (res.kind !== 'I64' || res.value !== 200n) throw new Error("Sync constant init failed");

    // 2. Double init check
    interp.callFunctionSync('testSync', []);

    // 3. Sync Unknown Function
    try {
        interp.callFunctionSync('unknown', []);
        throw new Error("Should have thrown error for unknown sync function");
    } catch (e: any) {
        if (!e.message.includes('Unknown function')) throw new Error("Wrong error for unknown sync function");
    }

    // 4. Sync Arity Mismatch
    try {
        interp.callFunctionSync('testSync', [{ kind: 'I64', value: 1n }]);
        throw new Error("Should have thrown error for sync arity mismatch");
    } catch (e: any) {
        if (!e.message.includes('Arity mismatch')) throw new Error("Wrong error for sync arity mismatch");
    }
}

export const t391_unit_coverage: TestCase = {
    name: 'Test 391: Unit Coverage for Internals',
    fn: async () => {
        testCheckLiteral();
        await testEvalExpr();
        testEvalConstructor();
        await testInterpreterCoverage();
        testInterpreterSyncCoverage();
    }
};
