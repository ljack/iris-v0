import { Parser, printValue } from './sexp';
import { TypeChecker } from './typecheck';
import { Interpreter } from './eval';
import { ModuleResolver } from './types';

export function run(source: string, fsMap: Record<string, string> = {}, modules: Record<string, string> = {}): string {
    // 1. Parse
    const parser = new Parser(source);
    let program;
    try {
        program = parser.parse();
    } catch (e: any) {
        return `ParseError: ${e.message}`;
    }

    // Create resolver
    const resolver: ModuleResolver = (path: string) => {
        const modSource = modules[path];
        if (!modSource) return undefined;
        try {
            const p = new Parser(modSource);
            return p.parse();
        } catch (e) {
            console.error(`Failed to parse module ${path}:`, e);
            return undefined;
        }
    };

    // 2. Typecheck
    const checker = new TypeChecker(resolver);
    try {
        checker.check(program);
    } catch (e: any) {
        if (e.message.startsWith('TypeError:')) {
            return e.message;
        }
        return `TypeError: ${e.message}`;
    }

    // 3. Interpret
    const interpreter = new Interpreter(program, fsMap, resolver);
    let result;
    try {
        result = interpreter.evalMain();
    } catch (e: any) {
        return `RuntimeError: ${e.message}`;
    }

    return printValue(result);
}
