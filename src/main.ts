import { Parser, printValue } from './sexp';
import { TypeChecker } from './typecheck';
import { Interpreter } from './eval';

export function run(source: string, fs: Record<string, string> = {}): string {
    // 1. Parse
    const parser = new Parser(source);
    const program = parser.parse();

    // 2. Typecheck
    const checker = new TypeChecker(program);
    checker.check();

    // 3. Interpret
    const interpreter = new Interpreter(program, fs);
    const result = interpreter.evalMain();

    return printValue(result);
}
