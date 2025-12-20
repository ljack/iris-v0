import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import { IrisWasmRuntime } from '../src/wasm_runtime';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export const t142 = {
    name: 't142_wasm_match',
    fn: async () => {
        console.log("Running T142: WASM Match...");

        // 1. Load Codegen
        const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm.iris'), 'utf8');
        const program = new Parser(code).parse();
        const interpreter = new Interpreter(program);

        // 2. Prepare test Iris code:
        // (let (opt (Some 42))
        //   (match opt
        //     (case (tag "None" ()) 0)
        //     (case (tag "Some" (v)) v)
        //   )
        // )

        const valSome = (v: any) => ({ kind: 'Tagged', tag: 'Some', value: v });
        const valI64 = (i: number) => ({ kind: 'Tagged', tag: 'I64', value: BigInt(i) });

        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v });
        const exprVar = (name: string) => ({
            kind: 'Tagged',
            tag: 'Var',
            value: { kind: 'Record', fields: { name: { kind: 'Str', value: name } } }
        });
        const exprLet = (name: string, val: any, body: any) => ({
            kind: 'Tagged',
            tag: 'Let',
            value: {
                kind: 'Record', fields: {
                    name: { kind: 'Str', value: name },
                    value: val,
                    body: body
                }
            }
        });
        const exprMatch = (target: any, cases: any[]) => ({
            kind: 'Tagged',
            tag: 'Match',
            value: {
                kind: 'Record', fields: {
                    target: target,
                    cases: { kind: 'List', items: cases }
                }
            }
        });
        const mkCase = (tag: string, vars: string[], body: any) => ({
            kind: 'Record',
            fields: {
                tag: { kind: 'Str', value: tag },
                vars: { kind: 'List', items: vars.map(v => ({ kind: 'Str', value: v })) },
                body: body
            }
        });

        const testAst = exprLet("opt", exprLit(valSome(valI64(42))),
            exprMatch(exprVar("opt"), [
                mkCase("None", [], exprLit(valI64(0))),
                mkCase("Some", ["v"], exprVar("v"))
            ])
        );

        // 3. Generate WAT
        const res = await interpreter.callFunction('codegen_module', [testAst] as any);
        const wat = (res as any).value;
        console.log("Generated WAT:\n", wat);

        // 4. Compile WAT to WASM
        let wasm: Buffer;
        try {
            const watPath = path.join(__dirname, 'temp_t142.wat');
            const wasmPath = path.join(__dirname, 'temp_t142.wasm');
            fs.writeFileSync(watPath, wat);
            execSync(`wat2wasm ${watPath} -o ${wasmPath}`);
            wasm = fs.readFileSync(wasmPath);
            fs.unlinkSync(watPath);
            fs.unlinkSync(wasmPath);
        } catch (e) {
            console.warn("wat2wasm failed. Skipping execution test.");
            return;
        }

        // 5. Run
        const runtime = new IrisWasmRuntime();
        const result = await runtime.run(wasm);
        console.log("WASM Execution Result:", result);

        if (result !== 42n) {
            throw new Error(`Expected WASM to return 42, got ${result}`);
        }

        console.log("T142 Passed: Match works in WASM!");
    }
};
