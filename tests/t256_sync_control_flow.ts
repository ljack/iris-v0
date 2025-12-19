import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';

// Advanced tests for sync evaluation - Control Flow and Intrinsics

export const t256_sync_tco_let: TestCase = {
    name: 'Test 256: sync TCO let binding',
    fn: async () => {
        const source = `(program
 (module (name "t256") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x 10)
        (let (y 20)
          (+ x y))))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'I64' || result.value !== 30n) {
            throw new Error(`Expected 30, got ${JSON.stringify(result)}`);
        }
    }
};

export const t257_sync_tco_if: TestCase = {
    name: 'Test 257: sync TCO if',
    fn: async () => {
        const source = `(program
 (module (name "t257") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (if true 10 20))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'I64' || result.value !== 10n) {
            throw new Error(`Expected 10, got ${JSON.stringify(result)}`);
        }
    }
};

export const t258_sync_tco_call: TestCase = {
    name: 'Test 258: sync TCO tail call',
    fn: async () => {
        const source = `(program
 (module (name "t258") (version 0))
 (defs
  (deffn (name helper)
    (args (x I64))
    (ret I64)
    (eff !Pure)
    (body x))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call helper 42))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'I64' || result.value !== 42n) {
            throw new Error(`Expected 42, got ${JSON.stringify(result)}`);
        }
    }
};

export const t268_sync_normalize_literal: TestCase = {
    name: 'Test 268: sync normalize literal in equality',
    fn: async () => {
        const source = `(program
 (module (name "t268") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (= 42 42))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'Bool' || result.value !== true) {
            throw new Error(`Expected true, got ${JSON.stringify(result)}`);
        }
    }
};

export const t269_sync_bool_ops: TestCase = {
    name: 'Test 269: sync bool ops & |',
    fn: async () => {
        const source = `(program
 (module (name "t269") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (& true (| false true)))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'Bool' || result.value !== true) {
            throw new Error(`Expected true, got ${JSON.stringify(result)}`);
        }
    }
};

export const t270_sync_not_operator: TestCase = {
    name: 'Test 270: sync Not operator',
    fn: async () => {
        const source = `(program
 (module (name "t270") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (Not false))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'Bool' || result.value !== true) {
            throw new Error(`Expected true, got ${JSON.stringify(result)}`);
        }
    }
};
