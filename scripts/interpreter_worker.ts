
import { parentPort, workerData } from 'worker_threads';
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

Error.stackTraceLimit = Infinity;

async function run() {
    const { programSource, sources, fileName, target } = workerData;

    try {
        const parser = new Parser(programSource);
        const program = parser.parse();

        const hostFs = {
            readFile: (p: string) => {
                if (sources[p]) return sources[p];
                if (p === fileName) return sources[fileName]; // Fallback if fileName is just the key
                // Try relative to workspace
                try {
                    return fs.readFileSync(p, 'utf8');
                } catch (e) {
                    return null;
                }
            },
            writeFile: (p: string, c: string) => {
                // Return success to iris, but actually we just log it or we could use parentPort to send it back
                console.log(`Worker wrote file ${p} (${c.length} bytes)`);
                return true;
            },
            exists: (p: string) => {
                return !!sources[p] || fs.existsSync(p);
            }
        };

        const moduleResolver = (modulePath: string) => {
            if (sources[modulePath]) {
                const p = new Parser(sources[modulePath]);
                return p.parse();
            }
            return undefined;
        };

        const interpreterCache = new Map<string, Interpreter>();
        const interp = new Interpreter(program, hostFs, moduleResolver, undefined, interpreterCache);

        const result = interp.callFunctionSync('compile_file', [
            { kind: 'Str', value: fileName },
            { kind: 'Str', value: target }
        ]);

        parentPort?.postMessage({ success: true, result });
    } catch (e: any) {
        parentPort?.postMessage({ success: false, error: e.message, stack: e.stack });
    }
}

run();
