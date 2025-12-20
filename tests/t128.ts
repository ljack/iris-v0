
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// T128: Functionality Verification for parser.iris
export const t128 = {
    name: 'Test 128: Parser.iris Functionality',
    fn: async () => {
        console.log("Running T128: Parser.iris...");

        const parserIrisPath = path.join(__dirname, '../examples/real/compiler/parser.iris');
        const code = fs.readFileSync(parserIrisPath, 'utf-8');

        // Helper to load and parse dependency
        const loadDep = (name: string) => {
            const p = path.join(__dirname, `../examples/real/compiler/${name}.iris`);
            const c = fs.readFileSync(p, 'utf-8');
            // console.log(`Loading ${name}...`);
            return new Parser(c).parse();
        };

        const astMod = loadDep('ast');
        const listMod = loadDep('list');
        const baseMod = loadDep('parser_base');
        const topMod = loadDep('parser_top');
        const exprMod = loadDep('parser_expr');
        const typeMod = loadDep('parser_type');

        const resolver: ModuleResolver = (path: string) => {
            if (path === 'ast') return astMod;
            if (path === 'list') return listMod;
            if (path === 'parser_base') return baseMod;
            if (path === 'parser_top') return topMod;
            if (path === 'parser_expr') return exprMod;
            if (path === 'parser_type') return typeMod;
            return undefined;
        };

        // 1. Parse
        console.log("Parsing parser.iris...");
        const parser = new Parser(code);
        const programAst = parser.parse();

        // 2. Typecheck
        console.log("Typechecking parser.iris...");
        const checker = new TypeChecker(resolver);
        checker.check(programAst);

        // 3. Eval and Verify
        console.log("Evaluating parser.iris...");
        const interpreter = new Interpreter(programAst, {}, resolver);

        // Test 1: Parse minimal program
        // (program (module (name "test") (version 1)))
        const tokensList = [
            { k: 'LPAREN', v: '(' },
            { k: 'IDENT', v: 'program' },
            { k: 'LPAREN', v: '(' },
            { k: 'IDENT', v: 'module' },
            { k: 'LPAREN', v: '(' },
            { k: 'IDENT', v: 'name' },
            { k: 'Str', v: 'test' },
            { k: 'RPAREN', v: ')' },
            { k: 'LPAREN', v: '(' },
            { k: 'IDENT', v: 'version' },
            { k: 'INT', v: '1' },
            { k: 'RPAREN', v: ')' },
            { k: 'RPAREN', v: ')' },
            { k: 'RPAREN', v: ')' }
        ];

        const tokensItems = tokensList.map(t => ({
            kind: 'Record',
            fields: {
                kind: { kind: 'Str', value: t.k },
                value: { kind: 'Str', value: t.v }
            }
        }));

        const tokens = { kind: 'List', items: tokensItems };

        const res = await interpreter.callFunction('parse', [tokens as any]);
        console.log("Parse Result:", JSON.stringify(res, (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value, 2));

        // Expected: ast.Program Record
        // (record (progMod (record (name "test") (version 1))) (progImports (tag "nil" ...)) (progDefs (tag "nil" ...)))

        if (res.kind !== 'Record') throw new Error(`Expected Record, got ${res.kind}`);

        const mod = (res.fields as any).progMod;
        if (!mod) throw new Error("Missing progMod");

        const name = (mod.fields as any).name;
        if (name.value !== 'test') throw new Error(`Expected name 'test', got ${name.value}`);

        const ver = (mod.fields as any).version;
        if (ver.value !== 1n) throw new Error(`Expected version 1, got ${ver.value}`);

        console.log("T128 Passed: parser.iris correctly parsed minimal program.");
    }
};
