
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t145 = {
    name: 't145_typecheck_to_wasm',
    fn: async () => {
        console.log("Running T145: TypeCheck to WASM (Compiling typecheck.iris -> WASM)...");

        const loadFile = (name: string) => fs.readFileSync(path.join(__dirname, `../examples/${name}`), 'utf-8');

        const sources: Record<string, string> = {
            'compiler': loadFile('compiler.iris'),
            'lexer': loadFile('lexer.iris'),
            'parser': loadFile('parser.iris'),
            'typecheck': loadFile('typecheck.iris'),
            'codegen': loadFile('codegen.iris'),
            'codegen_wasm': loadFile('codegen_wasm.iris')
        };

        const parser = new Parser(sources['compiler']);
        const program = parser.parse();

        const moduleResolver = (modulePath: string) => {
            if (sources[modulePath]) {
                const p = new Parser(sources[modulePath]);
                return p.parse();
            }
            return undefined;
        };

        const fileSystem = {
            readFile: (p: string) => {
                if (p === 'examples/typecheck.iris') return sources['typecheck'];
                return null;
            },
            writeFile: (p: string, c: string) => true,
            exists: (p: string) => true
        };

        const interpreter = new Interpreter(program, fileSystem, moduleResolver);

        console.log("Compiling examples/typecheck.iris to WASM...");

        const resWASM = interpreter.callFunctionSync('compile_file', [
            valStr('examples/typecheck.iris'),
            valStr('wasm')
        ]);

        assertOk(resWASM);
        const wasmSource = (resWASM as any).value.value;

        if (!wasmSource.includes('(module')) {
            throw new Error("WASM output does not look like a module");
        }

        console.log("Generated WASM size:", wasmSource.length);
        if (!fs.existsSync('dist')) fs.mkdirSync('dist');
        fs.writeFileSync('dist/typecheck_self_hosted.wat', wasmSource);

        console.log("Verifying WASM validity...");
        const wsp = await require("wabt")();
        const module = wsp.parseWat("typecheck.wat", wasmSource);
        module.resolveNames();
        module.validate();

        console.log("T145 Passed: TypeCheck compiled to valid WASM!");
    }
};

const valStr = (s: string) => ({ kind: 'Str', value: s } as any);

function assertOk(res: any) {
    if (res.kind !== 'Tagged' || res.tag !== 'Ok') {
        throw new Error(`Expected Ok, got ${JSON.stringify(res, null, 2)}`);
    }
}

if (require.main === module) {
    t145.fn().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
