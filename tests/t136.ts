import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t136 = {
    name: 't136_wasm_control_flow',
    fn: async () => {
        console.log("Running T136: WASM Control Flow...");

        const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm.iris'), 'utf8');
        const parser = new Parser(code);
        const program = parser.parse();

        // Type Check
        const checker = new TypeChecker();
        checker.check(program);

        // Eval
        const interpreter = new Interpreter(program);

        // Helpers
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
        const valBool = (b: boolean) => ({ kind: 'Tagged', tag: 'Bool', value: { kind: 'Bool', value: b } } as any);
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);
        const exprIf = (cond: any, then: any, else_: any) => ({
            kind: 'Tagged',
            tag: 'If',
            value: {
                // kind: 'Tuple' was wrong for Record structure
                kind: 'Record',
                fields: { cond, then, else: else_ }
            }
        } as any);

        const exprCall = (name: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Call',
            value: {
                kind: 'Tuple',
                items: [
                    { kind: 'Str', value: name },
                    { kind: 'List', items: args }
                ]
            }
        } as any);

        // Test 1: If(true, 1, 0)
        // (if (result i64) (i32.const 1) (then (i64.const 1)) (else (i64.const 0)))
        const ast1 = exprIf(
            exprLit(valBool(true)),
            exprLit(valI64(1n)),
            exprLit(valI64(0n))
        );

        const res1 = await interpreter.callFunction('codegen_wasm', [ast1]);
        // Normalize output for check
        const expected1 = `(i32.const 1)
(if (result i64)
(then (i64.const 1))
(else (i64.const 0))
)`;
        assertEx(res1, expected1);

        // Test 2: Call("foo", [10])
        const ast2 = exprCall("foo", [exprLit(valI64(10n))]);
        const res2 = await interpreter.callFunction('codegen_wasm', [ast2]);
        const expected2 = `(i64.const 10)
(call $foo)`;
        assertEx(res2, expected2);

        console.log("T136 Passed: WASM Control Flow (If/Call) works!");
    }
};

function assertEx(res: any, expected: string) {
    if (res.kind !== 'Str') {
        throw new Error(`Expected Str result, got ${JSON.stringify(res)}`);
    }
    // Simple whitespace normalization for comparison
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    if (norm(res.value) !== norm(expected)) {
        throw new Error(`Expected:\n${expected}\nGot:\n${res.value}`);
    }
    console.log(`OK: ${res.value.replace(/\n/g, '\\n')}`);
}
