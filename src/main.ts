import { Parser, printValue } from './sexp';
import { TypeChecker } from './typecheck';
import { Interpreter } from './eval';

export function run(source: string, fs: Record<string, string> = {}): string {
    try {
        // 1. Parse
        const parser = new Parser(source);
        let program;
        try {
            program = parser.parse();
        } catch (e: any) {
            return `ParseError: ${e.message}`;
        }

        // 3. Typecheck
        const checker = new TypeChecker();
        try {
            checker.check(program);
        } catch (e: any) {
            // If the error message already starts with "TypeError:", just return it.
            if (e.message.startsWith('TypeError:')) {
                return e.message;
            }
            return `TypeError: ${e.message}`;
        }

        // 3. Interpret
        const interpreter = new Interpreter(program, fs);
        let result;
        try {
            result = interpreter.evalMain();
        } catch (e: any) {
            return `RuntimeError: ${e.message}`;
        }

        return printValue(result);

    } catch (e: any) {
        // Top level fallback
        return `RuntimeError: ${e.message}`;
    }
}
