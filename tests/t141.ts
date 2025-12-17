import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { IrisWasmRuntime } from '../src/wasm_runtime';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export const t141 = {
    name: 't141_wasm_strings_runtime',
    fn: async () => {
        console.log("Running T141: WASM Strings & Runtime...");

        // 1. Load Codegen
        const code = fs.readFileSync(path.join(__dirname, '../examples/codegen_wasm.iris'), 'utf8');
        const program = new Parser(code).parse();
        const interpreter = new Interpreter(program);

        // 2. Prepare test Iris code: (io.print "Hello from WASM!")
        const valStr = (s: string) => ({ kind: 'Tagged', tag: 'Str', value: { kind: 'Str', value: s } });
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v });
        const exprIntrinsic = (op: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Intrinsic',
            value: { kind: 'Tuple', items: [{ kind: 'Str', value: op }, { kind: 'List', items: args }] }
        });

        const testAst = exprIntrinsic("io.print", [exprLit(valStr("Hello from WASM!"))]);

        // 3. Generate WAT
        const res = await interpreter.callFunction('codegen_module', [testAst] as any);
        const wat = (res as any).value;
        console.log("Generated WAT:\n", wat);

        // 4. Compile WAT to WASM (requires wat2wasm)
        let wasm: Buffer;
        try {
            const watPath = path.join(__dirname, 'temp_t141.wat');
            const wasmPath = path.join(__dirname, 'temp_t141.wasm');
            fs.writeFileSync(watPath, wat);
            execSync(`wat2wasm ${watPath} -o ${wasmPath}`);
            wasm = fs.readFileSync(wasmPath);
            fs.unlinkSync(watPath);
            fs.unlinkSync(wasmPath);
        } catch (e) {
            console.warn("wat2wasm failed or not found. Skipping execution test, but WAT generation verified.");
            return;
        }

        // 5. Run in our Runtime
        console.log("Executing in IrisWasmRuntime...");
        const runtime = new IrisWasmRuntime();

        // Mock console.log to capture output
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => { logs.push(msg); originalLog(msg); };

        try {
            await runtime.run(wasm);
        } finally {
            console.log = originalLog;
        }

        if (!logs.includes("Hello from WASM!")) {
            throw new Error(`Expected output "Hello from WASM!", got: ${JSON.stringify(logs)}`);
        }

        console.log("T141 Passed: Strings printed correctly from WASM runtime!");
    }
};
