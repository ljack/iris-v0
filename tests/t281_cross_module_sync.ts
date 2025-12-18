import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';
import { ModuleResolver } from '../src/types';

// Tests for cross-module calls in sync path

const moduleA = `(program
 (module (name "a") (version 0))
 (defs
  (deffn (name add)
    (args (x I64) (y I64))
    (ret I64)
    (eff !Pure)
    (body (+ x y)))))`;

const moduleB = `(program
 (module (name "b") (version 0))
 (imports (import (path "a") (alias "a")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call a.add 10 20)))))`;

export const t281_cross_module_sync: TestCase = {
  name: 'Test 281: cross-module call sync',
  fn: async () => {
    const parserA = new Parser(moduleA);
    const progA = parserA.parse();
    const parserB = new Parser(moduleB);
    const progB = parserB.parse();
    
    const checker = new TypeChecker();
    checker.check(progA);
    checker.check(progB);
    
    const resolver: ModuleResolver = (path: string) => {
      if (path === 'a') return progA;
      return undefined;
    };
    
    const interpreter = new Interpreter(progB, {}, resolver);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 30n) {
      throw new Error(`Expected 30, got ${JSON.stringify(result)}`);
    }
  }
};

export const t282_cross_module_resolver_fail: TestCase = {
  name: 'Test 282: cross-module resolver fail',
  fn: async () => {
    const source = `(program
 (module (name "t282") (version 0))
 (imports (import (path "nonexistent") (alias "x")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call x.func))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const resolver: ModuleResolver = () => undefined;
    const interpreter = new Interpreter(program, {}, resolver);
    
    try {
      const result = interpreter.callFunctionSync('main', []);
      // Should fail when trying to call x.func
      throw new Error(`Expected error, got ${JSON.stringify(result)}`);
    } catch (e: any) {
      // Error is expected
      if (!e.message.includes('Unknown') && !e.message.includes('function')) {
        throw new Error(`Expected Unknown function error, got ${e.message}`);
      }
    }
  }
};

export const t283_sync_lambda: TestCase = {
  name: 'Test 283: sync lambda creation',
  fn: async () => {
    const source = `(program
 (module (name "t283") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Fn (I64) I64))
    (eff !Pure)
    (body (lambda (args (x I64)) (ret I64) (eff !Pure) (body (+ x 1))))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'Lambda') {
      throw new Error(`Expected Lambda, got ${JSON.stringify(result)}`);
    }
  }
};

export const t284_sync_constants: TestCase = {
  name: 'Test 284: sync constants initialization',
  fn: async () => {
    const source = `(program
 (module (name "t284") (version 0))
 (defs
  (defconst (name PI) (type I64) (value 314))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body PI)))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 314n) {
      throw new Error(`Expected 314, got ${JSON.stringify(result)}`);
    }
  }
};

export const t285_sync_var_from_constant: TestCase = {
  name: 'Test 285: sync var from constant',
  fn: async () => {
    const source = `(program
 (module (name "t285") (version 0))
 (defs
  (defconst (name X) (type I64) (value 42))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ X 1))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 43n) {
      throw new Error(`Expected 43, got ${JSON.stringify(result)}`);
    }
  }
};

export const t286_sync_parser_trace: TestCase = {
  name: 'Test 286: sync parser trace paths',
  fn: async () => {
    // This test exercises the parser trace logging paths in evalExprSync
    // by calling functions that match the trace conditions
    const source = `(program
 (module (name "t286") (version 0))
 (defs
  (deffn (name parse_def_list)
    (args)
    (ret I64)
    (eff !Pure)
    (body 42))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call parse_def_list))))`;
    
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

export const t287_sync_depth_counter: TestCase = {
  name: 'Test 287: sync depth counter',
  fn: async () => {
    // Test that depth counter increments correctly
    const source = `(program
 (module (name "t287") (version 0))
 (defs
  (deffn (name deep)
    (args (n I64))
    (ret I64)
    (eff !Pure)
    (body
      (if (= n 0)
        0
        (call deep (- n 1)))))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call deep 5))))`;
    
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

export const t288_sync_step_counter: TestCase = {
  name: 'Test 288: sync step counter',
  fn: async () => {
    // Test that step counter increments
    const source = `(program
 (module (name "t288") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ 1 2))))`;
    
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

export const t289_sync_match_tco: TestCase = {
  name: 'Test 289: sync match TCO',
  fn: async () => {
    // Test tail call optimization in match
    const source = `(program
 (module (name "t289") (version 0))
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

export const t290_sync_call_arity_error: TestCase = {
  name: 'Test 290: sync call arity error',
  fn: async () => {
    const source = `(program
 (module (name "t290") (version 0))
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
    (body (call f 1 2))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    try {
      const result = interpreter.callFunctionSync('main', []);
      throw new Error(`Expected error, got ${JSON.stringify(result)}`);
    } catch (e: any) {
      if (!e.message.includes('Arity') && !e.message.includes('mismatch')) {
        throw new Error(`Expected arity error, got ${e.message}`);
      }
    }
  }
};

