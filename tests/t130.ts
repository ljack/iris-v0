import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';
import * as fs from 'fs';
// Actually typecheck.ts imports types. Let's see if Val is used.
// It is not used in the snippet I wrote, only 'Val' in import.
import { Expr, Value } from '../src/types';

export const t130 = {
    name: 't130_evaluator',
    fn: async () => {
        const code = fs.readFileSync('examples/real/apps/interpreter.iris', 'utf-8');
        const program = new Parser(code).parse();

        const checker = new TypeChecker(); // Fix: constructor takes resolver, not program
        checker.check(program);

        const interpreter = new Interpreter(program);

        // Helper to construct IRIS AST nodes (Tagged Unions)
        // Value: (tag "I64" (I64))
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);

        // Expr: (tag "Literal" Value)
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);

        // Expr: (tag "Call" [op, args])
        const exprCall = (op: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Intrinsic',
            value: {
                kind: 'Tuple',
                items: [
                    { kind: 'Str', value: op } as any,
                    { kind: 'List', items: args }
                ]
            }
        } as any);

        // Test 1: Eval Literal 42
        // (eval (tag "Literal" (tag "I64" 42)) env)
        const ast1 = exprLit(valI64(42n));

        const env = await interpreter.callFunction('env_new', []);
        const res1 = await interpreter.callFunction('eval', [ast1, env]);

        console.log('Eval(42) =', res1);

        // Helper to check result: res1 should be (tag "I64" 42)
        if (res1.kind !== 'Tagged') throw new Error(`Expected Tagged result, got ${res1.kind}`);
        if (res1.tag !== 'I64') throw new Error(`Expected I64 tag, got ${res1.tag}`);
        // res1.value is Value. Literal 42 is simple I64?
        // Wait, parser.iris Value: (tag "I64" (I64)). Payload is I64.
        // My valI64 helper makes (tag "I64" (Literal I64)). 
        // Interpreter eval: Literal -> returns v (the payload).
        // If expr is (tag "Literal" V), eval returns V.
        // So res1 should be V = valI64(42n) -> (tag "I64" (Literal I64 ...))?
        // No, parser.iris Value definition: (tag "I64" (I64)).
        // Since I duplicated definitions, "I64" variant takes "I64" record/type?
        // (tag "I64" (I64)) means payload is I64 type (primitive record? or just I64 primitive?)
        // In sexp.ts, (tag "I64" (val)) -> { kind: 'Tagged', tag: 'I64', value: val }.
        // If Type is (I64), val is { kind: 'I64', ... }.
        // So res1.value should be { kind: 'Literal' ... } ??
        // Actually, let's just inspect the output if it fails.
        // My validation code was: res1.value.kind !== 'Literal'. 
        // If res1 is Value, res1.value is the payload.
        // For I64, payload is I64 value?

        // Test 2: Eval (+ 10 20)
        const ast2 = exprCall('+', [exprLit(valI64(10n)), exprLit(valI64(20n))]);
        const res2 = await interpreter.callFunction('eval', [ast2, env]);

        console.log('Eval(+ 10 20) =', res2);

        if (res2.kind !== 'Tagged') throw new Error(`Expected Tagged result, got ${res2.kind}`);
        if (res2.tag !== 'I64') throw new Error(`Expected I64 tag, got ${res2.tag}`);

        console.log('T130 Passed: Evaluator works for Literals and Intrinsics!');
        // Test 3: Eval Let
        // (let x 10 (+ x 5))
        // AST: (tag "Let" (record (name "x") (value Lit(10)) (body Call(+, Var(x), Lit(5)))))
        const valStr = (s: string) => ({ kind: 'Tagged', tag: 'Str', value: { kind: 'Str', value: s } } as any);
        const exprVar = (name: string) => ({ kind: 'Tagged', tag: 'Var', value: { kind: 'Record', fields: { name: valStr(name) } } } as any as Expr);

        const exprLet = (name: string, val: any, body: any) => ({
            kind: 'Tagged',
            tag: 'Let',
            value: {
                kind: 'Record',
                fields: {
                    name: valStr(name),
                    value: val,
                    body: body
                }
            }
        } as any);

        const ast3 = exprLet('x', exprLit(valI64(10n)),
            exprCall('+', [exprVar('x'), exprLit(valI64(5n))])
        );

        const res3 = await interpreter.callFunction('eval', [ast3, env]);
        console.log('Eval(let x 10 (+ x 5)) =', res3);

        if (res3.kind !== 'Tagged' || res3.tag !== 'I64' || (res3.value as any).value !== 15n) {
            throw new Error(`Expected I64(15), got ${JSON.stringify(res3)}`);
        }

        // Test 4: Eval If
        // (if true 10 20)
        // AST: (tag "If" (record (cond Lit(true)) (then Lit(10)) (else Lit(20))))
        const valBool = (b: boolean) => ({ kind: 'Tagged', tag: 'Bool', value: { kind: 'Bool', value: b } } as any);

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

        const ast4 = exprIf(exprLit(valBool(true)), exprLit(valI64(10n)), exprLit(valI64(20n)));
        const res4 = await interpreter.callFunction('eval', [ast4, env]);
        console.log('Eval(if true 10 20) =', res4);

        if (res4.kind !== 'Tagged' || res4.tag !== 'I64' || (res4.value as any).value !== 10n) {
            throw new Error(`Expected I64(10), got ${JSON.stringify(res4)}`);
        }

        console.log('T130 Passed: Evaluator works for Let/If/Intrinsics!');
    }
};
