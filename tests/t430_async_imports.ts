import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';
import { ModuleResolver } from '../src/types';

// Tests for cross-module calls in ASYNC path (eff !Any)

const moduleA = `(program
 (module (name "a") (version 0))
 (defs
  (deffn (name add)
    (args (x I64) (y I64))
    (ret I64)
    (eff !Any)
    (body (+ x y)))))`;

const moduleB = `(program
 (module (name "b") (version 0))
 (imports (import "a" (as "a")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Any)
    (body (a.add 10 20)))))`;

export const t430_async_import_success: TestCase = {
    name: 'Test 430: cross-module call async',
    fn: async () => {
        const parserA = new Parser(moduleA);
        const progA = parserA.parse();
        const parserB = new Parser(moduleB);
        const progB = parserB.parse();

        // Resolver needed for TypeChecker
        const resolver: ModuleResolver = (path: string) => {
            if (path === 'a') return progA;
            return undefined;
        };

        const checker = new TypeChecker(resolver);
        checker.check(progA);
        checker.check(progB);

        const interpreter = new Interpreter(progB, {}, resolver);
        const result = await interpreter.callFunction('main', []);

        if (result.kind !== 'I64' || result.value !== 30n) {
            throw new Error(`Expected 30, got ${JSON.stringify(result)}`);
        }
    }
};

export const t431_async_import_fail: TestCase = {
    name: 'Test 431: cross-module resolver fail async',
    fn: async () => {
        const source = `(program
 (module (name "t431") (version 0))
 (imports (import "nonexistent" (as "x")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Any)
    (body (x.func)))))`;

        const parser = new Parser(source);
        const program = parser.parse();

        const resolver: ModuleResolver = () => undefined;
        const checker = new TypeChecker(resolver);

        try {
            checker.check(program); // This should probably fail if TC is strict?
        } catch (e: any) {
            // If TC fails, that's fine, but we want to test Runtime failure too if TC passes or assumes valid?
            // If TC fails with "Unknown function call", then test passes.
            if (e.message.includes('Unknown') || e.message.includes('function')) {
                return;
            }
            // If TC throws other error, rethrow
            throw e;
        }

        // If TC passed (maybe due to lax checking?), Interpreter should fail.
        const interpreter = new Interpreter(program, {}, resolver);

        try {
            const result = await interpreter.callFunction('main', []);
            throw new Error(`Expected error, got ${JSON.stringify(result)}`);
        } catch (e: any) {
            if (!e.message.includes('Unknown') && !e.message.includes('function')) {
                throw new Error(`Expected Unknown function error, got ${e.message}`);
            }
        }
    }
};
