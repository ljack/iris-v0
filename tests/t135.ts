
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t135 = {
    name: 't135_compiler_pipeline',
    fn: async () => {
        console.log("Running T135: Compiler Pipeline Integration...");

        // 1. Load all required source files
        const loadFile = (name: string) => fs.readFileSync(path.join(__dirname, `../examples/${name}`), 'utf-8');

        const sources: Record<string, string> = {
            'compiler': loadFile('compiler.iris'),
            'lexer': loadFile('lexer.iris'),
            'parser': loadFile('parser.iris'),
            'typecheck': loadFile('typecheck.iris'),
            'codegen': loadFile('codegen.iris'),
            'codegen_wasm': loadFile('codegen_wasm.iris'),
            'hello': loadFile('hello.iris') // Test input
        };

        // 2. Parse & Bootstapping the Compiler itself
        // We need to run `compiler.iris`. To do that, we parse it with host parser.
        const parser = new Parser(sources['compiler']);
        const program = parser.parse();

        // 3. Setup Interpreter with Module Resolver
        // The compiler imports lexer, parser, etc.
        // 3. Setup Interpreter with Module Resolver

        const moduleResolver = (modulePath: string) => {
            if (sources[modulePath]) {
                return new Parser(sources[modulePath]).parse();
            }
            return undefined;
        };

        const fileSystem = {
            readFile: (p: string) => {
                if (p === 'examples/hello.iris') return sources['hello'];
                if (p === 'hello.iris') return sources['hello'];
                return null;
            },
            writeFile: (p: string, c: string) => true,
            exists: (p: string) => true
        };

        const interpreter = new Interpreter(program, fileSystem, moduleResolver);

        // 4. Initialize Env (if needed)
        // compiler.iris likely has `main` or specific functions.
        // We will call `compile_file` directly.
        // (deffn (name compile_file) (args (path Str) (target Str)) (ret (Result Str Str)) ...)

        // Test 1: Compile to TypeScript
        console.log("Testing compile_file('examples/hello.iris', 'ts')...");
        const resTS = await interpreter.callFunction('compile_file', [
            valStr('examples/hello.iris'),
            valStr('ts')
        ]);

        // Expect Ok(Str)
        assertOk(resTS);
        const tsOutput = (resTS as any).value.value; // Result.Ok.value -> Str.value
        console.log("TS Output:", tsOutput);

        // Simple validation: check for generated TS code from hello.iris
        // hello.iris usually contains `(let x 123 "hello")` or similar (from lexer.iris main example?)
        // Let's check hello.iris content properly.
        // If hello.iris is `(program (module ...) (defs (deffn main ... (body (let x 10 x)))))`
        // We expect `... ((x) => { return x; })(10n) ...`
        if (!tsOutput.includes('return')) {
            throw new Error("TS output missing return statement");
        }

        // Test 2: Compile to WASM
        console.log("Testing compile_file('examples/hello.iris', 'wasm')...");
        const resWASM = await interpreter.callFunction('compile_file', [
            valStr('examples/hello.iris'),
            valStr('wasm')
        ]);

        assertOk(resWASM);
        const wasmOutput = (resWASM as any).value.value;
        console.log("WASM Output:", wasmOutput);

        if (!wasmOutput.includes('i64.const')) {
            throw new Error("WASM output missing i64.const");
        }

        console.log("T135 Passed: Compiler Pipeline works!");
    }
};

// Helpers
const valStr = (s: string) => ({ kind: 'Str', value: s } as any);

function assertOk(res: any) {
    // Result is Tagged("Ok", Value) or Tagged("Err", Value)
    // IRIS Result: (tag "Ok" (val)) or (tag "Err" (msg))
    // Interpreter value: { kind: 'Tagged', tag: 'Ok', value: ... }
    if (res.kind !== 'Tagged' || res.tag !== 'Ok') {
        throw new Error(`Expected Ok, got ${JSON.stringify(res, null, 2)}`);
    }
}
