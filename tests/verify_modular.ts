import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    const loadFile = (name: string) => fs.readFileSync(path.join(__dirname, `../examples/${name}`), 'utf-8');

    const sources: Record<string, string> = {
        'lexer': loadFile('lexer.iris'),
        'ast': loadFile('ast.iris'),
        'parser_base': loadFile('parser_base.iris'),
        'parser_type': loadFile('parser_type.iris'),
        'parser_expr': loadFile('parser_expr.iris'),
        'parser_top': loadFile('parser_top.iris'),
        'parser': loadFile('parser.iris'),
        'type_env': loadFile('type_env.iris'),
        'type_eq': loadFile('type_eq.iris'),
        'type_check_expr': loadFile('type_check_expr.iris'),
        'typecheck': loadFile('typecheck.iris'),
        'codegen_wasm_expr': loadFile('codegen_wasm_expr.iris'),
        'codegen_wasm': loadFile('codegen_wasm.iris'),
        'codegen': loadFile('codegen.iris'),
        'compiler': loadFile('compiler.iris'),
        'list': '(program (module (name "list") (version 1)) (imports) (defs (deffn (name length) (args (l (List I64))) (ret I64) (eff !Pure) (body 0))))',
        'map': '(program (module (name "map") (version 1)) (imports) (defs))',
        'str': '(program (module (name "str") (version 1)) (imports) (defs))',
        'io': '(program (module (name "io") (version 1)) (imports) (defs (deffn (name read_file) (args (p Str)) (ret (Result Str Str)) (eff !IO) (body (tag "Err" "not implemented"))) (deffn (name print) (args (s Str)) (ret I64) (eff !IO) (body 0))))',
    };

    const moduleResolver = (modulePath: string) => {
        if (sources[modulePath]) {
            const p = new Parser(sources[modulePath]);
            return p.parse();
        }
        throw new Error(`Module not found: ${modulePath}`);
    };

    console.log("Final verification of complete modular compiler...");

    console.log("Loading compiler.iris...");
    const p = new Parser(sources['compiler']);
    const program = p.parse();
    const interpreter = new Interpreter(program, {}, moduleResolver);

    console.log("Evaluating main (recursively resolves ALL modules)...");
    await interpreter.evalMain();

    console.log("SUCCESS: Entire modular compiler suite loaded and resolved correctly!");
}

test().catch(err => {
    console.error("Verification failed:");
    console.error(err);
    process.exit(1);
});
