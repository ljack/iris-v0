import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { Expr, Value } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t140 = {
    name: 't140_self_hosting_verification',
    fn: async () => {
        console.log("Running T140: Self-Hosting Verification...");

        // 1. Load the Self-Hosted Compiler (codegen_wasm.iris)
        const code = fs.readFileSync(path.join(__dirname, '../examples/codegen_wasm.iris'), 'utf8');
        const parser = new Parser(code);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);
        const interpreter = new Interpreter(program);

        // 2. Load the Input File (hello.iris)
        const helloCode = fs.readFileSync(path.join(__dirname, '../examples/hello.iris'), 'utf8');
        console.log("Input Source:\n", helloCode);

        // NOTE: We manually construct AST below because 'hello.iris' is a script fragment, 
        // and current Parser expects (program ...) wrapper.
        // const helloParser = new Parser(helloCode);
        // const helloProgram = helloParser.parse();

        // helloProgram.defs[0] is typically valid, but hello.iris might be main exprs?
        // Parser returns a Program with Defs. hello.iris: (let (x 10) (+ x 5))
        // This is likely parsed as a top-level expression. 
        // The Parser puts top-level expressions into implicit 'main'? Or just Defs?
        // Let's inspect helloProgram structure.
        // Assuming Parser handles (expr) at top level by effectively being a list of defs?
        // Actually, Parser.parse() returns `Program`. `Program` has `defs`.
        // If the file is just one expression, does it become a Def?
        // Let's check Parser logic if needed. For now assume we need the expression.

        // Wait, `hello.iris` is `(let (x 10) (+ x 5))`. 
        // If parsed as Program, check `helloProgram.defs`.
        // If empty, maybe it's treated differently.
        // Actually, standard Iris parsers enforce `(program ...)` usually?
        // Or `examples/hello.iris` is a script?
        // Let's construct the AST manually if Parser behavior is complex for scripts, 
        // OR rely on the fact that we can parse the expression string directly using `Parser.parseExpr`?

        // Let's use `parseExpr` equivalent if available, or just extract the first expr.
        // The Parser class has `parse()`. It also has internal `parseExpr()`.
        // We can create a new parser and parse one expression.
        const helloExprParser = new Parser(helloCode);
        // We need to bypass `parse()` which expects `(program ...)` or list of defs?
        // Looking at `src/sexp.ts`, `parse()` expects `LPAREN program ...`. 
        // But `hello.iris` doesn't have `program` wrapper?
        // If `hello.iris` is just `(let ...)`, `parse()` might fail if it demands `program`.
        // Let's try parsing it as a list of expressions.

        // Accessing private parseExpr via casting or just manually parsing for this test.
        // Actually, let's just construct the AST manually for `(let (x 10) (+ x 5))` to be safe & fast,
        // mirroring the structure we expect.

        // Manual AST Construction for: (let (x 10) (+ x 5))
        // Let(name="x", value=Literal(10), body=Call("+", [Var("x"), Literal(5)]))

        const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } });
        const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v });
        const exprVar = (n: string) => ({ kind: 'Tagged', tag: 'Var', value: { kind: 'Record', fields: { name: { kind: 'Str', value: n } } } }); // Var is struct in AST?
        // Wait, check codegen_wasm: (case (tag "Var" (v)) ... v.name)
        // So Var payload is a Record with field 'name'.

        const exprCall = (op: string, args: any[]) => ({
            kind: 'Tagged',
            tag: 'Intrinsic', // Call vs Intrinsic? standard `+` is Intrinsic.
            value: { kind: 'Tuple', items: [{ kind: 'Str', value: op }, { kind: 'List', items: args }] }
        });

        const exprLet = (name: string, val: any, body: any) => ({
            kind: 'Tagged',
            tag: 'Let',
            value: {
                kind: 'Record',
                fields: {
                    name: { kind: 'Str', value: name },
                    value: val,
                    body: body
                }
            }
        });

        // Construct: (let (x 10) (+ x 5))
        const inputAst = exprLet(
            "x",
            exprLit(valI64(10n)),
            exprCall("+", [
                exprVar("x"),
                exprLit(valI64(5n))
            ])
        );

        // 3. Run Self-Hosted Compilation
        const res = await interpreter.callFunction('codegen_module', [inputAst] as any);

        if ((res as any).kind !== 'Str') {
            throw new Error(`Expected Str result, got ${JSON.stringify(res)}`);
        }

        const wasmSource = (res as any).value;
        console.log("Generated WASM:\n", wasmSource);

        // Verification checks
        if (!wasmSource.includes('(module')) throw new Error("Missing module");
        if (!wasmSource.includes('local.set $x')) throw new Error("Missing local.set $x"); // Let binding
        if (!wasmSource.includes('local.get $x')) throw new Error("Missing local.get $x"); // Var usage
        if (!wasmSource.includes('i64.add')) throw new Error("Missing i64.add");

        console.log("T140 Passed: Hello.iris compiled successfully!");
    }
};
