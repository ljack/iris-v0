import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t137 = {
    name: 't137_wasm_data_structures',
    fn: async () => {
        console.log("Running T137: WASM Data Structures...");

        // Load self-hosted codegen
        const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm.iris'), 'utf8');
        const parser = new Parser(code);
        const program = parser.parse();

        // Check it (ensures valid Iris code)
        const checker = new TypeChecker();
        checker.check(program);

        // Run it
        const interpreter = new Interpreter(program);

        // Helpers to construct AST nodes manually (simulating Parser output)
        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);
        const exprList = (items: any[]) => ({
            kind: 'Tagged',
            tag: 'List',
            value: {
                kind: 'Record',
                fields: {
                    items: { kind: 'List', items: items },
                    typeArg: { kind: 'Tagged', tag: 'None', value: { kind: 'Record', fields: {} } }
                }
            }
        } as any);

        // Test 1: List Literal [1, 2]
        // Should generate code that allocates and stores.
        const ast1 = exprList([exprLit(valI64(1n)), exprLit(valI64(2n))]);

        const res1 = await interpreter.callFunction('codegen_wasm', [ast1]);

        // Result is { kind: 'Str', value: "..." }
        if (res1.kind !== 'Str') {
            throw new Error(`Expected Str result, got ${JSON.stringify(res1)}`);
        }

        const output = res1.value;
        console.log("Output List([1, 2]):\n", output);

        // Validation: Verify it produces non-empty string and mentions i64.store
        if (!output.includes('i64.store')) {
            throw new Error("Expected i64.store instructions for list construction");
        }
        if (!output.includes('call $alloc')) {
            throw new Error("Expected call $alloc");
        }

        // Test 2: list.get
        // (list.get [10, 20] 1)
        const valStr = (s: string) => ({ kind: 'Str', value: s });
        const exprIntrinsic = (op: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Intrinsic',
            value: { kind: 'Tuple', items: [valStr(op), { kind: 'List', items: args }] }
        } as any);
        const listAst = exprList([exprLit(valI64(10n)), exprLit(valI64(20n))]);
        const getAst = exprIntrinsic("list.get", [listAst, exprLit(valI64(1n))]);

        const res2 = await interpreter.callFunction('codegen_wasm', [getAst]);
        const output2 = (res2 as any).value;
        console.log("Output list.get:\n", output2);

        if (!output2.includes('i64.lt_u') || !output2.includes('then') || !output2.includes('else')) {
            throw new Error("Expected if/then/else bound check for list.get");
        }

        console.log("T137 Passed: List generation and Access (list.get) scaffold looks correct.");

        // Test 3: Tuple (tuple 1n)
        const exprTuple = (items: any[]) => ({ kind: 'Tagged', tag: 'Tuple', value: { kind: 'Record', fields: { items: { kind: 'List', items: items } } } } as any);
        const tupleAst = exprTuple([exprLit(valI64(1n))]);
        const res3 = await interpreter.callFunction('codegen_wasm', [tupleAst]);
        const output3 = (res3 as any).value;
        console.log("Output Tuple(1):\n", output3);
        if (!output3.includes('call $alloc') || !output3.includes('i64.store')) {
            throw new Error("Expected alloc/store for Tuple");
        }

        // Test 4: Record { x: 1n }
        const exprRecord = (fields: any[]) => ({ kind: 'Tagged', tag: 'Record', value: { kind: 'Record', fields: { fields: { kind: 'List', items: fields } } } } as any);
        // Field is Tuple(Str, Expr)
        const valTuple = (items: any[]) => ({ kind: 'Tuple', items: items });
        const field1 = valTuple([valStr("x"), exprLit(valI64(1n))]);
        const recordAst = exprRecord([field1]);

        const res4 = await interpreter.callFunction('codegen_wasm', [recordAst]);
        const output4 = (res4 as any).value;
        console.log("Output Record{x:1}:\n", output4);
        if (!output4.includes('call $alloc') || !output4.includes('i64.store')) {
            throw new Error("Expected alloc/store for Record");
        }

        console.log("T137 Passed: Tuple/Record generation verified.");
    }
};
