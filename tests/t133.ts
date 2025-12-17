
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';
import * as fs from 'fs';
import * as path from 'path';

export const t133 = {
    name: 't133_self_hosted_codegen',
    fn: async () => {
        console.log("Running T133: Self-hosted Code Generator...");

        const codePath = path.join(__dirname, '../examples/codegen.iris');
        const code = fs.readFileSync(codePath, 'utf-8');

        // 1. Parse & Host-Check
        const parser = new Parser(code);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        // 2. Init Interpreter
        const interpreter = new Interpreter(program);

        // Helpers (Same as t132 but with 'as any' from start)
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
        const valBool = (b: boolean) => ({ kind: 'Tagged', tag: 'Bool', value: { kind: 'Bool', value: b } } as any);
        const valStr = (s: string) => ({ kind: 'Tagged', tag: 'Str', value: { kind: 'Str', value: s } } as any);

        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);

        const exprIf = (cond: any, thenExpr: any, elseExpr: any) => ({
            kind: 'Tagged',
            tag: 'If',
            value: {
                kind: 'Record',
                fields: {
                    cond: cond,
                    then: thenExpr,
                    else: elseExpr
                }
            }
        } as any);

        const exprLet = (name: string, val: any, body: any) => ({
            kind: 'Tagged',
            tag: 'Let',
            value: {
                kind: 'Record',
                fields: {
                    name: { kind: 'Str', value: name },
                    value: val,
                    body: body
                }
            }
        } as any);

        const exprVar = (name: string) => ({
            kind: 'Tagged',
            tag: 'Var',
            value: {
                kind: 'Record',
                fields: { name: { kind: 'Str', value: name } }
            }
        } as any);

        const exprCall = (op: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Intrinsic',
            value: {
                kind: 'Tuple',
                items: [
                    { kind: 'Str', value: op },
                    { kind: 'List', items: args }
                ]
            }
        } as any);

        // --- Test 1: Literal(42) -> "42n" ---
        const ast1 = exprLit(valI64(42n));
        const res1 = await interpreter.callFunction('codegen', [ast1]);
        // Result is Str Value
        assertEx(res1, "42n");

        // --- Test 2: Literal(true) -> "true" ---
        const res2 = await interpreter.callFunction('codegen', [exprLit(valBool(true))]);
        assertEx(res2, "true");

        // --- Test 3: Literal("abc") -> "'abc'" ---
        const res3 = await interpreter.callFunction('codegen', [exprLit(valStr("abc"))]);
        assertEx(res3, "'abc'");

        // --- Test 4: Intrinsic (+ 1 2) -> "(1n + 2n)" ---
        const ast4 = exprCall('+', [exprLit(valI64(1n)), exprLit(valI64(2n))]);
        const res4 = await interpreter.callFunction('codegen', [ast4]);
        assertEx(res4, "(1n + 2n)");

        // --- Test 5: Let("x", 10, Var("x")) -> "((x) => { return x; })(10n)" ---
        const ast5 = exprLet("x", exprLit(valI64(10n)), exprVar("x"));
        const res5 = await interpreter.callFunction('codegen', [ast5]);
        assertEx(res5, "((x) => { return x; })(10n)");

        // --- Test 6: If(true, 1, 0) -> "(true ? 1n : 0n)" ---
        const ast6 = exprIf(exprLit(valBool(true)), exprLit(valI64(1n)), exprLit(valI64(0n)));
        const res6 = await interpreter.callFunction('codegen', [ast6]);
        assertEx(res6, "(true ? 1n : 0n)");

        console.log("T133 Passed: Self-hosted Code Generator produces valid TS strings!");
    }
};

function assertEx(res: any, expected: string) {
    if (res.kind !== 'Str' || res.value !== expected) {
        throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
    }
    console.log(`OK: ${expected}`);
}
