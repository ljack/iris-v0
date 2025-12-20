import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t138 = {
    name: 't138_wasm_module',
    fn: async () => {
        console.log("Running T138: WASM Module Generation...");

        const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm.iris'), 'utf8');
        const parser = new Parser(code);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);
        const interpreter = new Interpreter(program);

        // Helper to construct AST
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);
        const valStr = (s: string) => ({ kind: 'Str', value: s });
        const exprIntrinsic = (op: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Intrinsic',
            value: { kind: 'Tuple', items: [valStr(op), { kind: 'List', items: args }] }
        } as any);

        // Test io.print: (io.print 42)
        const printAst = exprIntrinsic("io.print", [exprLit(valI64(42n))]);

        // Call codegen_module with printAst
        const res = await interpreter.callFunction('codegen_module', [printAst]);

        if (res.kind !== 'Str') {
            throw new Error(`Expected Str result, got ${JSON.stringify(res)}`);
        }

        const output = res.value;
        console.log("Module Output:\n", output);

        // Verification
        const checks = [
            '(module',
            '(import "host" "print"',
            '(memory $memory 1)',
            '(global $heap_ptr (mut i64)',
            '(func $alloc',
            '(func $main',
            '(export "main"',
            'i64.const 42',
            '(call $print)'
        ];

        for (const check of checks) {
            if (!output.includes(check)) {
                throw new Error(`Expected module to contain: ${check}`);
            }
        }

        console.log("T138 Passed: WASM Module Generation looks correct.");
    }
};
