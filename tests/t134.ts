import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t134 = {
    name: 't134_self_hosted_wasm_codegen',
    fn: async () => {
        console.log("Running T134: Self-hosted WASM Code Generator...");

        const code = fs.readFileSync(path.join(__dirname, '../examples/codegen_wasm.iris'), 'utf8');
        const parser = new Parser(code);
        const program = parser.parse();

        // Type Check
        const checker = new TypeChecker();
        checker.check(program);

        // Eval
        const interpreter = new Interpreter(program);

        // Helpers to construct Runtime Values matching codegen_wasm.iris AST types
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);
        const exprIntrinsic = (op: string, args: any[]) => ({
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

        // Test 1: codegen_wasm(Literal(42)) -> "(i64.const 42)"
        const ast1 = exprLit(valI64(42n));
        const res1 = await interpreter.callFunction('codegen_wasm', [ast1]);
        assertEx(res1, "(i64.const 42)");

        // Test 2: codegen_wasm(add(1, 2)) -> "(i64.const 1)\n(i64.const 2)\n(i64.add)"
        const ast2 = exprIntrinsic("+", [exprLit(valI64(1n)), exprLit(valI64(2n))]);
        const res2 = await interpreter.callFunction('codegen_wasm', [ast2]);
        // Note: Newlines might be escaped in debug output, but strictly value should check out
        assertEx(res2, "(i64.const 1)\n(i64.const 2)\n(i64.add)");

        console.log("T134 Passed: Self-hosted WASM Code Generator produces valid WAT fragments!");
    }
};

function assertEx(res: any, expected: string) {
    if (res.kind !== 'Str' || res.value !== expected) {
        throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
    }
    console.log(`OK: ${expected.replace(/\n/g, '\\n')}`);
}
