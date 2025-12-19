import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';

// Advanced tests for sync evaluation - Error Types and IO Sync Handlers

export const t259_sync_tuple_access_error: TestCase = {
    name: 'Test 259: sync tuple access error',
    fn: async () => {
        const source = `(program
 (module (name "t259") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2))
        (let (val t.100)
          val)))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            const result = interpreter.callFunctionSync('main', []);
            throw new Error(`Expected error, got ${JSON.stringify(result)}`);
        } catch (e: any) {
            if (!e.message.includes('out of bounds')) {
                throw new Error(`Expected out of bounds error, got ${e.message}`);
            }
        }
    }
};

export const t260_sync_record_field_error: TestCase = {
    name: 'Test 260: sync record field error',
    fn: async () => {
        const source = `(program
 (module (name "t260") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x 42)))
        (let (val r.nonexistent)
          val)))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            const result = interpreter.callFunctionSync('main', []);
            throw new Error(`Expected error, got ${JSON.stringify(result)}`);
        } catch (e: any) {
            if (!e.message.includes('Unknown field')) {
                throw new Error(`Expected Unknown field error, got ${e.message}`);
            }
        }
    }
};

export const t261_sync_unknown_variable: TestCase = {
    name: 'Test 261: sync unknown variable',
    fn: async () => {
        const source = `(program
 (module (name "t261") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body nonexistent)))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            const result = interpreter.callFunctionSync('main', []);
            throw new Error(`Expected error, got ${JSON.stringify(result)}`);
        } catch (e: any) {
            if (!e.message.includes('Unknown variable')) {
                throw new Error(`Expected Unknown variable error, got ${e.message}`);
            }
        }
    }
};

export const t262_sync_if_condition_error: TestCase = {
    name: 'Test 262: sync if condition error',
    fn: async () => {
        const source = `(program
 (module (name "t262") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if 42 10 20))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        try {
            checker.check(program);
            // If type checker doesn't catch it, runtime should
            const interpreter = new Interpreter(program);
            try {
                const result = interpreter.callFunctionSync('main', []);
                throw new Error(`Expected error, got ${JSON.stringify(result)}`);
            } catch (e: any) {
                if (!e.message.includes('Bool')) {
                    throw new Error(`Expected Bool error, got ${e.message}`);
                }
            }
        } catch (e: any) {
            // Type error is also acceptable
            if (!e.message.includes('Bool')) {
                throw e;
            }
        }
    }
};

export const t263_sync_arithmetic_error: TestCase = {
    name: 'Test 263: sync arithmetic type error',
    fn: async () => {
        const source = `(program
 (module (name "t263") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ "hello" 1))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        try {
            checker.check(program);
            // If type checker doesn't catch it, runtime should
            const interpreter = new Interpreter(program);
            try {
                const result = interpreter.callFunctionSync('main', []);
                throw new Error(`Expected error, got ${JSON.stringify(result)}`);
            } catch (e: any) {
                if (!e.message.includes('I64')) {
                    throw new Error(`Expected I64 error, got ${e.message}`);
                }
            }
        } catch (e: any) {
            // Type error is also acceptable
            if (!e.message.includes('I64')) {
                throw e;
            }
        }
    }
};

export const t264_sync_io_read_file: TestCase = {
    name: 'Test 264: sync io.read_file',
    fn: async () => {
        const source = `(program
 (module (name "t264") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "test.txt"))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program, { 'test.txt': 'hello' });
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'Result' || !result.isOk || result.value.kind !== 'Str' || result.value.value !== 'hello') {
            throw new Error(`Expected Ok("hello"), got ${JSON.stringify(result)}`);
        }
    }
};

export const t265_sync_io_file_exists: TestCase = {
    name: 'Test 265: sync io.file_exists',
    fn: async () => {
        const source = `(program
 (module (name "t265") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !IO)
    (body (io.file_exists "test.txt"))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program, { 'test.txt': 'content' });
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'Bool' || result.value !== true) {
            throw new Error(`Expected true, got ${JSON.stringify(result)}`);
        }
    }
};

export const t266_sync_io_print: TestCase = {
    name: 'Test 266: sync io.print',
    fn: async () => {
        const source = `(program
 (module (name "t266") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !IO)
    (body (io.print "test"))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'I64' || result.value !== 0n) {
            throw new Error(`Expected 0, got ${JSON.stringify(result)}`);
        }
    }
};

export const t267_sync_async_intrinsic_error: TestCase = {
    name: 'Test 267: sync async intrinsic error',
    fn: async () => {
        const source = `(program
 (module (name "t267") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.listen 8080))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        try {
            const result = interpreter.callFunctionSync('main', []);
            throw new Error(`Expected error, got ${JSON.stringify(result)}`);
        } catch (e: any) {
            if (!e.message.includes('async intrinsic') && !e.message.includes('Cannot call')) {
                throw new Error(`Expected async intrinsic error, got ${e.message}`);
            }
        }
    }
};
