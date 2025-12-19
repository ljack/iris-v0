import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';

// Advanced tests for sync evaluation - Match paths

export const t252_sync_match_tagged: TestCase = {
    name: 'Test 252: sync match tagged with tuple',
    fn: async () => {
        const source = `(program
 (module (name "t252") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tagged "Pair" (tuple 1 2)))
        (match val
          (case (tag "Pair" (a b)) (+ a b))
          (case (tag "_") 0))))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'I64' || result.value !== 3n) {
            throw new Error(`Expected 3, got ${JSON.stringify(result)}`);
        }
    }
};

export const t253_sync_match_list: TestCase = {
    name: 'Test 253: sync match list cons',
    fn: async () => {
        const source = `(program
 (module (name "t253") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1 2 3)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) h)))))`;

        const parser = new Parser(source);
        const program = parser.parse();
        const checker = new TypeChecker();
        checker.check(program);

        const interpreter = new Interpreter(program);
        const result = interpreter.callFunctionSync('main', []);

        if (result.kind !== 'I64' || result.value !== 1n) {
            throw new Error(`Expected 1, got ${JSON.stringify(result)}`);
        }
    }
};

export const t254_sync_match_result: TestCase = {
    name: 'Test 254: sync match Result',
    fn: async () => {
        const source = `(program
 (module (name "t254") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Ok 42)
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) 0)))))`;

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

export const t255_sync_match_option: TestCase = {
    name: 'Test 255: sync match Option',
    fn: async () => {
        const source = `(program
 (module (name "t255") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0)))))`;

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
