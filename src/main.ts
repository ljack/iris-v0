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

        // 2. Typecheck
        const checker = new TypeChecker(program);
        try {
            checker.check();
        } catch (e: any) {
            // Map common errors to canonical format if needed, OR just ensure messages are prefixed often
            // My typechecker throws "Type Error..." or "Effect violation".
            // Canonical spec says: `TypeError: <message>`, `TypeError: EffectMismatch: <message>`
            // My typechecker output: `Type Error in ...: ...` or `Effect violation: ...`

            let msg = e.message;
            if (msg.startsWith('Type Error')) {
                return `TypeError: ${msg}`;
            }
            if (msg.startsWith('Effect violation')) {
                return `TypeError: EffectMismatch: ${msg}`;
            }
            return `TypeError: ${msg}`; // Default to TypeError for checker phase
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
