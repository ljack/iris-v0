
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import * as fs from 'fs';
import * as path from 'path';

// T128: Functionality Verification for parser.iris
export const t128 = {
    name: 'Test 128: Parser.iris Functionality',
    fn: async () => {
        console.log("Running T128: Parser.iris...");

        const parserIrisPath = path.join(__dirname, '../examples/parser.iris');
        const code = fs.readFileSync(parserIrisPath, 'utf-8');

        // 1. Parse
        console.log("Parsing parser.iris...");
        const parser = new Parser(code);
        const programAst = parser.parse();
        console.log("Program AST:", JSON.stringify(programAst, (key, value) => {
            if (key === 'loc') return undefined;
            if (typeof value === 'bigint') return value.toString() + 'n';
            return value;
        }, 2));

        // 2. Typecheck
        console.log("Typechecking parser.iris...");
        const checker = new TypeChecker();
        checker.check(programAst);

        // 3. Eval and Verify
        console.log("Evaluating parser.iris...");
        const interpreter = new Interpreter(programAst);

        // Test 1: Parse integer literal "123"
        // Token: { kind: "INT", value: "123" }
        const tokenIntp = {
            kind: 'Record',
            fields: { kind: { kind: 'Str', value: "INT" }, value: { kind: 'Str', value: "123" } }
        };
        const tokens = { kind: 'List', items: [tokenIntp] };

        const res = await interpreter.callFunction('parse', [tokens as any]);
        console.log("Parse Result:", JSON.stringify(res, (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value, 2));

        // Expected: Literal(I64(123))
        // Represented as Tuple: ["Literal", ["I64", 123n]]
        // Expected: Tagged "Literal" (val)
        if (res.kind !== 'Tagged') throw new Error(`Expected Tagged expr, got ${res.kind}`);
        if (res.tag !== 'Literal') throw new Error(`Expected Literal tag, got ${res.tag}`);

        const inner = res.value; // Value
        // Value is Tagged "I64" (val)
        if (inner.kind !== 'Tagged') throw new Error("Expected Tagged value");
        if (inner.tag !== 'I64') throw new Error("Expected I64 tag");
        const innerVal = inner.value;
        if (innerVal.kind !== 'I64' || innerVal.value !== 123n) {
            throw new Error(`Expected 123, got ${JSON.stringify(innerVal)}`);
        }

        console.log("T128 Passed: parser.iris compiles and correctly parses integer literal.");

        // Test 2: Parse function call "(add 1 2)"
        // Tokens: LPAREN, IDENT(add), INT(1), INT(2), RPAREN
        const tokensCall = {
            kind: 'List', items: [
                { kind: 'Record', fields: { kind: { kind: 'Str', value: "LPAREN" }, value: { kind: 'Str', value: "(" } } },
                { kind: 'Record', fields: { kind: { kind: 'Str', value: "IDENT" }, value: { kind: 'Str', value: "add" } } },
                { kind: 'Record', fields: { kind: { kind: 'Str', value: "INT" }, value: { kind: 'Str', value: "1" } } },
                { kind: 'Record', fields: { kind: { kind: 'Str', value: "INT" }, value: { kind: 'Str', value: "2" } } },
                { kind: 'Record', fields: { kind: { kind: 'Str', value: "RPAREN" }, value: { kind: 'Str', value: ")" } } }
            ]
        };

        const resCall = await interpreter.callFunction('parse', [tokensCall as any]);
        console.log("Parse Call Result:", JSON.stringify(resCall, (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value, 2));

        // Expected: Call(fn="add", args=[Literal(1), Literal(2)])
        // Representation: Tuple ["Call", { fn: "add", args: List[...] }]
        // Expected: Tagged "Call" (Tuple (name args))
        // Representation: Tagged("Call", Tuple(["add", List([...])]))
        if (resCall.kind !== 'Tagged') throw new Error(`Expected Tagged expr for Call, got ${resCall.kind}`);
        if (resCall.tag !== 'Call') throw new Error(`Expected Call tag, got ${resCall.tag}`);

        const callPay = resCall.value;
        if (callPay.kind !== 'Tuple') throw new Error(`Expected Tuple payload for Call, got ${callPay.kind}`);
        const callName = callPay.items[0]; // Name
        const callArgs = callPay.items[1]; // Args (List)

        if (callName.kind !== 'Str' || callName.value !== 'add') throw new Error(`Expected function name 'add', got ${JSON.stringify(callName)}`);
        if (callArgs.kind !== 'List') throw new Error(`Expected args List, got ${callArgs.kind}`);
        if (callArgs.items.length !== 2) throw new Error(`Expected 2 args, got length ${callArgs.items.length}`);
    }
};
