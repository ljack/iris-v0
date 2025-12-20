import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import * as fs from 'fs';
import * as path from 'path';

// T127: Self-Hosted Lexer Test
// Loads examples/real/compiler/lexer.iris and executes it.

function loadIrisFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
}

async function runTest() {
    console.log("Running T127: Self-Hosted Lexer...");

    const lexerCode = loadIrisFile(path.join(__dirname, '../examples/real/compiler/lexer.iris'));

    // 1. Parse
    const parser = new Parser(lexerCode);
    const programAst = parser.parse();

    // 2. Typecheck
    const checker = new TypeChecker();
    checker.check(programAst);
    console.log("Typecheck passed.");

    // 3. Eval
    const interpreter = new Interpreter(programAst);

    // Capture output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args: any[]) => {
        output.push(args.join(' '));
    };

    try {
        await interpreter.evalMain();
    } finally {
        console.log = originalLog;
    }

    // Verify output
    // Input: "(let x 123 \"hello\")"
    // Expected Tokens:
    // LPAREN: (
    // KEYWORD: let
    // IDENT: x
    // INT: 123
    // STR: hello
    // RPAREN: )
    // EOF: 

    const expected = [
        "LPAREN: (",
        "KEYWORD: let",
        "IDENT: x",
        "INT: 123",
        "STR: hello",
        "RPAREN: )",
        "EOF:"
    ];

    let passed = true;
    if (output.length !== expected.length) {
        console.error(`Expected ${expected.length} lines, got ${output.length}`);
        passed = false;
    } else {
        for (let i = 0; i < expected.length; i++) {
            if (output[i].trim() !== expected[i]) {
                console.error(`Mismatch line ${i}: Expected '${expected[i]}', Got '${output[i]}'`);
                passed = false;
            }
        }
    }

    if (passed) {
        console.log("T127 Passed!");
    } else {
        console.log("Output:");
        console.log(output.join('\n'));
        console.error("T127 Failed.");
        process.exit(1);
    }
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
