
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';
import * as fs from 'fs';
import * as path from 'path';

export const t132 = {
    name: 't132_self_hosted_typechecker',
    fn: async () => {
        console.log("Running T132: Self-hosted Type Checker...");

        const codePath = path.join(__dirname, '../examples/real/compiler/typecheck.iris');
        const code = fs.readFileSync(codePath, 'utf-8');

        // 1. Parse & Host-Check
        const parser = new Parser(code);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        // 2. Init Interpreter
        const interpreter = new Interpreter(program);

        // Helpers to construct IRIS AST nodes for input to the self-hosted function
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
        const valBool = (b: boolean) => ({ kind: 'Tagged', tag: 'Bool', value: { kind: 'Bool', value: b } } as any);

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

        const exprVar = (name: string) => ({
            kind: 'Tagged',
            tag: 'Var',
            value: {
                kind: 'Record',
                fields: { name: { kind: 'Str', value: name } }
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

        // Get initial environment
        const env = await interpreter.callFunction('env_new', []);

        // --- Test 1: Literal(42) => Ok(I64) ---
        const ast1 = exprLit(valI64(42n));
        const res1 = await interpreter.callFunction('type_check', [ast1, env]);
        console.log('type_check(Literal(42)) =', logFormat(res1));

        assertOk(res1);
        assertType((res1 as any).value, 'I64');

        // --- Test 2: Literal(true) => Ok(Bool) ---
        const ast2 = exprLit(valBool(true));
        const res2 = await interpreter.callFunction('type_check', [ast2, env]);
        console.log('type_check(Literal(true)) =', logFormat(res2));

        assertOk(res2);
        assertType((res2 as any).value, 'Bool');

        // --- Test 3: If(true, 10, 20) => Ok(I64) ---
        const ast3 = exprIf(
            exprLit(valBool(true)),
            exprLit(valI64(10n)),
            exprLit(valI64(20n))
        );
        const res3 = await interpreter.callFunction('type_check', [ast3, env]);
        console.log('type_check(If(true, 10, 20)) =', logFormat(res3));

        assertOk(res3);
        assertType((res3 as any).value, 'I64');

        // --- Test 4: If(true, 10, true) => Err("If branches must have same type") ---
        const ast4 = exprIf(
            exprLit(valBool(true)),
            exprLit(valI64(10n)),
            exprLit(valBool(true))
        );
        const res4 = await interpreter.callFunction('type_check', [ast4, env]);
        console.log('type_check(If(true, 10, true)) =', logFormat(res4));

        assertErr(res4, "If branches must have same type");

        // --- Test 5: Let("x", 10, Var("x")) => Ok(I64) ---
        const ast5 = exprLet('x', exprLit(valI64(10n)), exprVar('x'));
        const res5 = await interpreter.callFunction('type_check', [ast5, env]);
        console.log('type_check(Let(x, 10, x)) =', logFormat(res5));

        assertOk(res5);
        assertType((res5 as any).value, 'I64');

        // --- Test 6: (+ 10 20) => Ok(I64) ---
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

        const ast6 = exprCall('+', [exprLit(valI64(10n)), exprLit(valI64(20n))]);
        const res6 = await interpreter.callFunction('type_check', [ast6, env]);
        console.log('type_check(+ 10 20) =', logFormat(res6));

        assertOk(res6);
        assertType((res6 as any).value, 'I64');

        // --- Test 7: (+ 10 true) => Err("Right operand of + must be I64") ---
        const ast7 = exprCall('+', [exprLit(valI64(10n)), exprLit(valBool(true))]);
        const res7 = await interpreter.callFunction('type_check', [ast7, env]);
        console.log('type_check(+ 10 true) =', logFormat(res7));

        assertErr(res7, "Right operand of + must be I64");

        console.log("T132 Passed: Self-hosted Type Checker verification (including Intrinsics) successful!");
    }
};

function logFormat(val: any): string {
    return JSON.stringify(val, (k, v) => typeof v === 'bigint' ? v.toString() + 'n' : v);
}

function assertOk(res: any) {
    if (res.kind !== 'Tagged' || res.tag !== 'Ok') {
        throw new Error(`Expected OkVal, got ${JSON.stringify(res)}`);
    }
}

function assertErr(res: any, msgIncludes?: string) {
    if (res.kind !== 'Tagged' || res.tag !== 'Err') {
        throw new Error(`Expected ErrVal, got ${JSON.stringify(res)}`);
    }
    if (msgIncludes) {
        // Err val is Str
        const msg = (res.value as any).value;
        if (!msg.includes(msgIncludes)) {
            throw new Error(`Expected error message to include "${msgIncludes}", got "${msg}"`);
        }
    }
}

function assertType(ty: any, expectedTag: string) {
    if (ty.kind !== 'Tagged' || ty.tag !== expectedTag) {
        throw new Error(`Expected Type Tag ${expectedTag}, got ${JSON.stringify(ty)}`);
    }
}
