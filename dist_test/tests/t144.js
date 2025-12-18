import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';
export const t144 = {
    name: 't144_parser_to_wasm',
    fn: async () => {
        console.log("Running T144: Parser to WASM (Compiling parser.iris -> WASM)...");
        const loadFile = (name) => fs.readFileSync(path.join(__dirname, `../examples/${name}`), 'utf-8');
        const sources = {
            'compiler': loadFile('compiler.iris'),
            'lexer': loadFile('lexer.iris'),
            'parser': loadFile('parser.iris'),
            'typecheck': loadFile('typecheck.iris'),
            'codegen': loadFile('codegen.iris'),
            'codegen_wasm': loadFile('codegen_wasm.iris')
        };
        const parser = new Parser(sources['compiler']);
        const program = parser.parse();
        const moduleResolver = (modulePath) => {
            if (sources[modulePath]) {
                const p = new Parser(sources[modulePath]);
                return p.parse();
            }
            return undefined;
        };
        const fileSystem = {
            readFile: (p) => {
                if (p === 'examples/parser.iris')
                    return sources['parser'];
                return null;
            },
            writeFile: (p, c) => true,
            exists: (p) => true
        };
        const interpreter = new Interpreter(program, fileSystem, moduleResolver);
        console.log("Compiling examples/parser.iris to WASM...");
        const resWASM = interpreter.callFunctionSync('compile_file', [
            valStr('examples/parser.iris'),
            valStr('wasm')
        ]);
        assertOk(resWASM);
        const wasmSource = resWASM.value.value;
        if (!wasmSource.includes('(module')) {
            throw new Error("WASM output does not look like a module");
        }
        console.log("Generated WASM size:", wasmSource.length);
        console.log("Verifying WASM validity...");
        const wabt = await require("wabt")();
        const module = wabt.parseWat("parser.wat", wasmSource);
        module.resolveNames();
        module.validate();
        console.log("T144 Passed: Parser compiled to valid WASM!");
    }
};
const valStr = (s) => ({ kind: 'Str', value: s });
function assertOk(res) {
    if (res.kind !== 'Tagged' || res.tag !== 'Ok') {
        throw new Error(`Expected Ok, got ${JSON.stringify(res, null, 2)}`);
    }
}
if (require.main === module) {
    t144.fn().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
