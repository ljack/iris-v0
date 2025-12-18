import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';

// Tests for match edge cases and non-exhaustive patterns

export const t271_match_non_exhaustive: TestCase = {
  name: 'Test 271: match non-exhaustive',
  fn: async () => {
    const source = `(program
 (module (name "t271") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "Some" (v)) v)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    // This should work since Some matches
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 42n) {
      throw new Error(`Expected 42, got ${JSON.stringify(result)}`);
    }
  }
};

export const t272_match_wildcard: TestCase = {
  name: 'Test 272: match wildcard',
  fn: async () => {
    const source = `(program
 (module (name "t272") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0)
        (case (tag "_") 100)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 100n) {
      throw new Error(`Expected 100, got ${JSON.stringify(result)}`);
    }
  }
};

export const t273_match_list_cons_two_vars: TestCase = {
  name: 'Test 273: match list cons with two vars',
  fn: async () => {
    const source = `(program
 (module (name "t273") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1 2 3)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) (list.length t)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 2n) {
      throw new Error(`Expected 2, got ${JSON.stringify(result)}`);
    }
  }
};

export const t274_match_tuple_tagged: TestCase = {
  name: 'Test 274: match tuple as tagged union',
  fn: async () => {
    const source = `(program
 (module (name "t274") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Some" 42)
        (case (tag "Some" (x)) x)
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

export const t275_match_tuple_tagged_multiple_vars: TestCase = {
  name: 'Test 275: match tuple tagged with multiple vars',
  fn: async () => {
    const source = `(program
 (module (name "t275") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Pair" 1 2)
        (case (tag "Pair" (a b)) (+ a b))
        (case (tag "_") 0)))))`;
    
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

export const t276_match_tagged_tuple_payload: TestCase = {
  name: 'Test 276: match tagged with tuple payload',
  fn: async () => {
    const source = `(program
 (module (name "t276") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tagged "Pair" (tuple 1 2)))
        (match val
          (case (tag "Pair" (a b)) (+ a b))
          (case (tag "_") 0)))))`;
    
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

export const t277_match_result_err: TestCase = {
  name: 'Test 277: match Result Err',
  fn: async () => {
    const source = `(program
 (module (name "t277") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body
      (match (Err "error")
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) e)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'Str' || result.value !== 'error') {
      throw new Error(`Expected "error", got ${JSON.stringify(result)}`);
    }
  }
};

export const t278_match_option_none: TestCase = {
  name: 'Test 278: match Option None',
  fn: async () => {
    const source = `(program
 (module (name "t278") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (None)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0)))))`;
    
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

export const t279_match_list_nil: TestCase = {
  name: 'Test 279: match list nil',
  fn: async () => {
    const source = `(program
 (module (name "t279") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) 1)))))`;
    
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

export const t280_match_no_match_error: TestCase = {
  name: 'Test 280: match no matching case error',
  fn: async () => {
    const source = `(program
 (module (name "t280") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    try {
      const result = interpreter.callFunctionSync('main', []);
      throw new Error(`Expected error, got ${JSON.stringify(result)}`);
    } catch (e: any) {
      if (!e.message.includes('matching case') && !e.message.includes('Non - exhaustive')) {
        throw new Error(`Expected matching case error, got ${e.message}`);
      }
    }
  }
};

