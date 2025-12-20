
import { runWithStack } from './worker_launcher';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Running T144 via Worker (128MB Stack)...");

    const loadFile = (name: string) =>
        fs.readFileSync(path.join(__dirname, `../examples/real/compiler/${name}`), 'utf-8');

    const sources: Record<string, string> = {
        'compiler': loadFile('compiler.iris'),
        'lexer': loadFile('lexer.iris'),
        'parser': loadFile('parser.iris'),
        'typecheck': loadFile('typecheck.iris'),
        'codegen': loadFile('codegen.iris'),
        'codegen_wasm': loadFile('codegen_wasm.iris')
    };

    const workerPath = path.join(__dirname, 'interpreter_worker.ts');

    try {
        const response: any = await runWithStack(workerPath, {
            programSource: sources['compiler'],
            sources: sources,
            fileName: 'examples/real/compiler/parser.iris',
            target: 'wasm'
        }, 128);

        if (!response.success) {
            console.error("Worker Execution Failed:");
            console.error(response.error.substring(0, 1000));
            process.exit(1);
        }

        const resWASM = response.result;
        if (resWASM.kind !== 'Tagged' || resWASM.tag !== 'Ok') {
            console.error("Compilation Failed:", JSON.stringify(resWASM, null, 2));
            process.exit(1);
        }

        const wasmSource = resWASM.value.value;
        console.log("Generated WASM size:", wasmSource.length);
        console.log("WASM Snippet:\n", wasmSource.substring(0, 500));

        if (!wasmSource.includes('(module')) {
            console.error("WASM output does not look like a module");
            process.exit(1);
        }

        console.log("Verifying WASM validity...");
        const wabt = await require("wabt")();
        const module = wabt.parseWat("parser.wat", wasmSource);
        module.resolveNames();
        module.validate();

        console.log("T144 Passed: Parser compiled to valid WASM!");
    } catch (e) {
        console.error("Launcher Error:", e);
        process.exit(1);
    }
}

main();
