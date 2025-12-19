import { TestCase } from '../src/test-types';

// Tests for function call error paths

export const t361_call_function_error: TestCase = {
    name: 'Test 361: callFunction error',
    fn: async () => {
        const source = `(program
 (module (name "t361") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body 42))))`;

        const { Interpreter } = await import('../src/eval');
        const { Parser } = await import('../src/sexp');
        const { TypeChecker } = await import('../src/typecheck');

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            await interpreter.callFunction('nonexistent', []);
            throw new Error('Expected error');
        } catch (e: any) {
            if (!e.message.includes('Unknown function')) {
                throw new Error(`Expected Unknown function error, got ${e.message}`);
            }
        }
    }
};

export const t362_call_function_arity_error: TestCase = {
    name: 'Test 362: callFunction arity error',
    fn: async () => {
        const source = `(program
 (module (name "t362") (version 0))
 (defs
  (deffn (name f)
    (args (x I64))
    (ret I64)
    (eff !Pure)
    (body x))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body 42))))`;

        const { Interpreter } = await import('../src/eval');
        const { Parser } = await import('../src/sexp');
        const { TypeChecker } = await import('../src/typecheck');

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            await interpreter.callFunction('f', []);
            throw new Error('Expected error');
        } catch (e: any) {
            if (!e.message.includes('Arity mismatch')) {
                throw new Error(`Expected Arity mismatch error, got ${e.message}`);
            }
        }
    }
};

export const t363_no_main_error: TestCase = {
    name: 'Test 363: no main function error',
    fn: async () => {
        const source = `(program
 (module (name "t363") (version 0))
 (defs
  (deffn (name helper)
    (args)
    (ret I64)
    (eff !Pure)
    (body 42))))`;

        const { Interpreter } = await import('../src/eval');
        const { Parser } = await import('../src/sexp');
        const { TypeChecker } = await import('../src/typecheck');

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            await interpreter.evalMain();
            throw new Error('Expected error');
        } catch (e: any) {
            if (!e.message.includes('No main function')) {
                throw new Error(`Expected No main function error, got ${e.message}`);
            }
        }
    }
};

export const t370_async_call_with_resolver_no_func: TestCase = {
    name: 'Test 370: async call with resolver no func',
    expect: 'TypeError: Unknown function call: m.nonexistent',
    source: `(program
 (module (name "t370") (version 0))
 (imports (import "mod" (as "m")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call m.nonexistent)))))`,
    modules: {
        'mod': `(program
 (module (name "mod") (version 0))
 (defs
  (deffn (name other)
    (args)
    (ret I64)
    (eff !Pure)
    (body 42))))`
    }
};

export const t371_async_call_with_resolver_no_import: TestCase = {
    name: 'Test 371: async call with resolver no import',
    expect: 'TypeError: Unknown function call: m.func',
    source: `(program
 (module (name "t371") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call m.func)))))`
};

export const t372_async_call_with_resolver_no_program: TestCase = {
    name: 'Test 372: async call with resolver no program',
    expect: 'TypeError: Unknown function call: m.func',
    source: `(program
 (module (name "t372") (version 0))
 (imports (import "nonexistent" (as "m")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call m.func)))))`
};
