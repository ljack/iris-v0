
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

const sources: Record<string, string> = {
    'compiler': fs.readFileSync('./examples/compiler.iris', 'utf8'),
    'lexer': fs.readFileSync('./examples/lexer.iris', 'utf8'),
    'parser': fs.readFileSync('./examples/parser.iris', 'utf8'),
    'typecheck': fs.readFileSync('./examples/typecheck.iris', 'utf8'),
    'codegen': fs.readFileSync('./examples/codegen.iris', 'utf8'),
    'codegen_wasm': fs.readFileSync('./examples/codegen_wasm.iris', 'utf8'),
    'io': '',
    'str': '',
    'list': ''
};

const moduleResolver = (modulePath: string) => {
    if (sources[modulePath]) {
        const p = new Parser(sources[modulePath]);
        return p.parse();
    }
    return undefined;
};

async function main() {
    const programSource = sources['compiler'];
    const parser = new Parser(programSource);
    const program = parser.parse();

    const hostFs = {
        readFile: (p: string) => {
            if (p === 'examples/hello.iris') return fs.readFileSync(p, 'utf8');
            return null;
        },
        writeFile: (p: string, c: string) => {
            console.log(`Writing ${p} with length ${c.length}`);
            return true;
        },
        exists: (p: string) => true
    };

    const interpreterCache = new Map<string, Interpreter>();
    const interp = new Interpreter(program, hostFs, moduleResolver, undefined, undefined, interpreterCache);

    try {
        console.log("Calling compile_fileSync('examples/hello.iris', 'wasm')...");
        const result = interp.callFunctionSync('compile_file', [
            { kind: 'Str', value: 'examples/hello.iris' },
            { kind: 'Str', value: 'wasm' }
        ]);
        console.log("Result:", JSON.stringify(result));
    } catch (e: any) {
        console.error("Local Sync Execution Failed:");
        console.error(e.stack);
    }
}

main();
