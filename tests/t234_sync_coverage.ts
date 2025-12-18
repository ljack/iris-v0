import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter } from '../src/eval';

// Tests for sync evaluation paths (callFunctionSync, evalIntrinsicSync)

export const t234_sync_str_operations: TestCase = {
  name: 'Test 234: sync str operations',
  fn: async () => {
    const source = `(program
 (module (name "t234") (version 0))
 (defs
  (deffn (name test_str)
    (args)
    (ret Str)
    (eff !Pure)
    (body (str.concat "hello" "world")))
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body (call test_str)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('test_str', []);
    
    if (result.kind !== 'Str' || result.value !== 'helloworld') {
      throw new Error(`Expected "helloworld", got ${JSON.stringify(result)}`);
    }
  }
};

export const t235_sync_map_operations: TestCase = {
  name: 'Test 235: sync map operations',
  fn: async () => {
    const source = `(program
 (module (name "t235") (version 0))
 (defs
  (deffn (name test_map)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make))
        (let (m2 (map.put m "key" 42))
          (map.get m2 "key")))))
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (call test_map)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('test_map', []);
    
    if (result.kind !== 'Option' || result.value === null || result.value.kind !== 'I64' || result.value.value !== 42n) {
      throw new Error(`Expected Some(42), got ${JSON.stringify(result)}`);
    }
  }
};

export const t236_sync_list_operations: TestCase = {
  name: 'Test 236: sync list operations',
  fn: async () => {
    const source = `(program
 (module (name "t236") (version 0))
 (defs
  (deffn (name test_list)
    (args)
    (ret I64)
    (eff !Pure)
    (body (list.length (list 1 2 3))))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call test_list)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('test_list', []);
    
    if (result.kind !== 'I64' || result.value !== 3n) {
      throw new Error(`Expected 3, got ${JSON.stringify(result)}`);
    }
  }
};

export const t237_sync_tuple_record: TestCase = {
  name: 'Test 237: sync tuple and record',
  fn: async () => {
    const source = `(program
 (module (name "t237") (version 0))
 (defs
  (deffn (name test_tuple)
    (args)
    (ret I64)
    (eff !Pure)
    (body (tuple.get (tuple 1 2 3) 1)))
  (deffn (name test_record)
    (args)
    (ret I64)
    (eff !Pure)
    (body (record.get (record (x 42)) "x")))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ (call test_tuple) (call test_record)))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('main', []);
    
    if (result.kind !== 'I64' || result.value !== 44n) {
      throw new Error(`Expected 44, got ${JSON.stringify(result)}`);
    }
  }
};

export const t238_sync_bool_operations: TestCase = {
  name: 'Test 238: sync bool operations',
  fn: async () => {
    const source = `(program
 (module (name "t238") (version 0))
 (defs
  (deffn (name test_bool)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (&& true (|| false true))))
  (deffn (name test_not)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (! false)))
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (&& (call test_bool) (call test_not)))))`;
    
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

export const t239_sync_comparison: TestCase = {
  name: 'Test 239: sync comparison operators',
  fn: async () => {
    const source = `(program
 (module (name "t239") (version 0))
 (defs
  (deffn (name test_ge)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (>= 5 3)))
  (deffn (name test_gt)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (> 5 3)))
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (&& (call test_ge) (call test_gt)))))`;
    
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

export const t240_sync_i64_conversions: TestCase = {
  name: 'Test 240: sync i64 conversions',
  fn: async () => {
    const source = `(program
 (module (name "t240") (version 0))
 (defs
  (deffn (name test_to_string)
    (args)
    (ret Str)
    (eff !Pure)
    (body (i64.to_string 42)))
  (deffn (name test_from_string)
    (args)
    (ret I64)
    (eff !Pure)
    (body (i64.from_string "42")))
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (= (call test_to_string) "42"))))`;
    
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

export const t241_sync_list_unique: TestCase = {
  name: 'Test 241: sync list.unique',
  fn: async () => {
    const source = `(program
 (module (name "t241") (version 0))
 (defs
  (deffn (name test_unique)
    (args)
    (ret I64)
    (eff !Pure)
    (body (list.length (list.unique (list 1 2 2 3 3 1)))))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call test_unique))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('test_unique', []);
    
    if (result.kind !== 'I64' || result.value !== 3n) {
      throw new Error(`Expected 3, got ${JSON.stringify(result)}`);
    }
  }
};

export const t242_sync_str_advanced: TestCase = {
  name: 'Test 242: sync str advanced operations',
  fn: async () => {
    const source = `(program
 (module (name "t242") (version 0))
 (defs
  (deffn (name test_str_ops)
    (args)
    (ret Bool)
    (eff !Pure)
    (body
      (let (s "hello")
        (let (len (str.len s))
          (let (sub (str.substring s 1 4))
            (let (idx (str.index_of s "l"))
              (&& (= len 5) (= sub "ell") (= idx (Some 2)))))))))
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (call test_str_ops))))`;
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program);
    const result = interpreter.callFunctionSync('test_str_ops', []);
    
    if (result.kind !== 'Bool' || result.value !== true) {
      throw new Error(`Expected true, got ${JSON.stringify(result)}`);
    }
  }
};

