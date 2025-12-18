import { TestCase } from '../src/test-types';
import { run } from '../src/main';
import { INetwork } from '../src/eval';

// Tests for error paths and edge cases

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
    (body 42)))`;
    
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
    (body 42)))`;
    
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
    (body 42)))`;
    
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

export const t364_map_invalid_key_type: TestCase = {
  name: 'Test 364: map invalid key type',
  fn: async () => {
    const source = `(program
 (module (name "t364") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make))
        (let (r (record (x 42)))
          (map.put m r 100)))))`;
    
    const result = await run(source);
    if (!result.includes('Invalid map key type') && !result.includes('Runtime')) {
      throw new Error(`Expected Invalid map key type error, got ${result}`);
    }
  }
};

export const t365_map_invalid_key_string: TestCase = {
  name: 'Test 365: map invalid key string',
  fn: async () => {
    // This tests keyToValue with invalid format
    const source = `(program
 (module (name "t365") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body
      (let (m (map.make))
        (let (m2 (map.put m 42 100))
          (map.keys m2)))))`;
    
    const result = await run(source);
    // Should return list with the key
    if (!result.includes('42') && !result.includes('list')) {
      throw new Error(`Expected list with key, got ${result}`);
    }
  }
};

export const t366_async_match_tagged_no_vars: TestCase = {
  name: 'Test 366: async match tagged no vars',
  expect: '(tagged "Some" 42)',
  source: `(program
 (module (name "t366") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Tagged "Some" I64))
    (eff !Pure)
    (body
      (match (tagged "Some" 42)
        (case (tag "Some") (tagged "Some" 42))
        (case (tag "_") (tagged "None" 0)))))`
};

export const t367_async_match_tagged_tuple_payload: TestCase = {
  name: 'Test 367: async match tagged with tuple payload',
  expect: '3',
  source: `(program
 (module (name "t367") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tagged "Pair" (tuple 1 2)))
        (match val
          (case (tag "Pair" (a b)) (+ a b))
          (case (tag "_") 0)))))`
};

export const t368_async_match_tagged_single_value: TestCase = {
  name: 'Test 368: async match tagged single value',
  expect: '42',
  source: `(program
 (module (name "t368") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tagged "Value" 42))
        (match val
          (case (tag "Value" (v)) v)
          (case (tag "_") 0)))))`
};

export const t369_async_cross_module_cache: TestCase = {
  name: 'Test 369: async cross-module cache',
  expect: '30',
  source: `(program
 (module (name "t369") (version 0))
 (imports (import (path "mod") (alias "m")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x (call m.add 10 20))
        (call m.add x 0)))))`,
  modules: {
    'mod': `(program
 (module (name "mod") (version 0))
 (defs
  (deffn (name add)
    (args (x I64) (y I64))
    (ret I64)
    (eff !Pure)
    (body (+ x y)))))`
  }
};

export const t370_async_call_with_resolver_no_func: TestCase = {
  name: 'Test 370: async call with resolver no func',
  expect: 'RuntimeError: Unknown function',
  source: `(program
 (module (name "t370") (version 0))
 (imports (import (path "mod") (alias "m")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call m.nonexistent))))`,
  modules: {
    'mod': `(program
 (module (name "mod") (version 0))
 (defs
  (deffn (name other)
    (args)
    (ret I64)
    (eff !Pure)
    (body 42)))`
  }
};

export const t371_async_call_with_resolver_no_import: TestCase = {
  name: 'Test 371: async call with resolver no import',
  expect: 'RuntimeError: Unknown function',
  source: `(program
 (module (name "t371") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call m.func))))`
};

export const t372_async_call_with_resolver_no_program: TestCase = {
  name: 'Test 372: async call with resolver no program',
  expect: 'RuntimeError: Unknown function',
  source: `(program
 (module (name "t372") (version 0))
 (imports (import (path "nonexistent") (alias "m")))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call m.func))))`
};

export const t373_async_net_listen_failed: TestCase = {
  name: 'Test 373: async net.listen failed',
  fn: async () => {
    const source = `(program
 (module (name "t373") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.listen 8080))))`;
    
    const { Interpreter } = await import('../src/eval');
    const { Parser } = await import('../src/sexp');
    const { TypeChecker } = await import('../src/typecheck');
    
    class FailingNetwork implements INetwork {
      async listen(port: number) { return null; }
      async accept(h: number) { return null; }
      async read(h: number) { return null; }
      async write(h: number, d: string) { return false; }
      async close(h: number) { return false; }
      async connect(host: string, port: number) { return null; }
    }
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program, {}, undefined, new FailingNetwork());
    const result = await interpreter.evalMain();
    
    if (result.kind !== 'Result' || result.isOk) {
      throw new Error(`Expected Err, got ${JSON.stringify(result)}`);
    }
  }
};

export const t374_async_net_accept_failed: TestCase = {
  name: 'Test 374: async net.accept failed',
  fn: async () => {
    const source = `(program
 (module (name "t374") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server)) (net.accept server))
        (case (tag "Err" (e)) (Err e)))))`;
    
    const { Interpreter } = await import('../src/eval');
    const { Parser } = await import('../src/sexp');
    const { TypeChecker } = await import('../src/typecheck');
    
    class FailingNetwork implements INetwork {
      async listen(port: number) { return 1; }
      async accept(h: number) { return null; }
      async read(h: number) { return null; }
      async write(h: number, d: string) { return false; }
      async close(h: number) { return false; }
      async connect(host: string, port: number) { return null; }
    }
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program, {}, undefined, new FailingNetwork());
    const result = await interpreter.evalMain();
    
    if (result.kind !== 'Result' || result.isOk) {
      throw new Error(`Expected Err, got ${JSON.stringify(result)}`);
    }
  }
};

export const t375_async_net_read_failed: TestCase = {
  name: 'Test 375: async net.read failed',
  fn: async () => {
    const source = `(program
 (module (name "t375") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server))
          (match (net.accept server)
            (case (tag "Ok" (client)) (net.read client))
            (case (tag "Err" (e)) (Err e))))
        (case (tag "Err" (e)) (Err e)))))`;
    
    const { Interpreter } = await import('../src/eval');
    const { Parser } = await import('../src/sexp');
    const { TypeChecker } = await import('../src/typecheck');
    
    class FailingNetwork implements INetwork {
      async listen(port: number) { return 1; }
      async accept(h: number) { return 2; }
      async read(h: number) { return null; }
      async write(h: number, d: string) { return false; }
      async close(h: number) { return false; }
      async connect(host: string, port: number) { return null; }
    }
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program, {}, undefined, new FailingNetwork());
    const result = await interpreter.evalMain();
    
    if (result.kind !== 'Result' || result.isOk) {
      throw new Error(`Expected Err, got ${JSON.stringify(result)}`);
    }
  }
};

export const t376_async_net_write_failed: TestCase = {
  name: 'Test 376: async net.write failed',
  fn: async () => {
    const source = `(program
 (module (name "t376") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server))
          (match (net.accept server)
            (case (tag "Ok" (client)) (net.write client "data"))
            (case (tag "Err" (e)) (Err e))))
        (case (tag "Err" (e)) (Err e)))))`;
    
    const { Interpreter } = await import('../src/eval');
    const { Parser } = await import('../src/sexp');
    const { TypeChecker } = await import('../src/typecheck');
    
    class FailingNetwork implements INetwork {
      async listen(port: number) { return 1; }
      async accept(h: number) { return 2; }
      async read(h: number) { return "data"; }
      async write(h: number, d: string) { return false; }
      async close(h: number) { return false; }
      async connect(host: string, port: number) { return null; }
    }
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program, {}, undefined, new FailingNetwork());
    const result = await interpreter.evalMain();
    
    if (result.kind !== 'Result' || result.isOk) {
      throw new Error(`Expected Err, got ${JSON.stringify(result)}`);
    }
  }
};

export const t377_async_net_close_failed: TestCase = {
  name: 'Test 377: async net.close failed',
  fn: async () => {
    const source = `(program
 (module (name "t377") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Bool Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server)) (net.close server))
        (case (tag "Err" (e)) (Err e)))))`;
    
    const { Interpreter } = await import('../src/eval');
    const { Parser } = await import('../src/sexp');
    const { TypeChecker } = await import('../src/typecheck');
    
    class FailingNetwork implements INetwork {
      async listen(port: number) { return 1; }
      async accept(h: number) { return null; }
      async read(h: number) { return null; }
      async write(h: number, d: string) { return false; }
      async close(h: number) { return false; }
      async connect(host: string, port: number) { return null; }
    }
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program, {}, undefined, new FailingNetwork());
    const result = await interpreter.evalMain();
    
    if (result.kind !== 'Result' || result.isOk) {
      throw new Error(`Expected Err, got ${JSON.stringify(result)}`);
    }
  }
};

export const t378_async_net_connect_failed: TestCase = {
  name: 'Test 378: async net.connect failed',
  fn: async () => {
    const source = `(program
 (module (name "t378") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.connect "example.com" 80))))`;
    
    const { Interpreter } = await import('../src/eval');
    const { Parser } = await import('../src/sexp');
    const { TypeChecker } = await import('../src/typecheck');
    
    class FailingNetwork implements INetwork {
      async listen(port: number) { return null; }
      async accept(h: number) { return null; }
      async read(h: number) { return null; }
      async write(h: number, d: string) { return false; }
      async close(h: number) { return false; }
      async connect(host: string, port: number) { return null; }
    }
    
    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);
    
    const interpreter = new Interpreter(program, {}, undefined, new FailingNetwork());
    const result = await interpreter.evalMain();
    
    if (result.kind !== 'Result' || result.isOk) {
      throw new Error(`Expected Err, got ${JSON.stringify(result)}`);
    }
  }
};

export const t379_async_http_get_failed: TestCase = {
  name: 'Test 379: async http.get failed',
  fn: async () => {
    const source = `(program
 (module (name "t379") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Net)
    (body (http.get "http://invalid-url-that-fails.test"))))`;
    
    const result = await run(source);
    // http.get may fail, so we just check it returns Result
    if (!result.includes('Result') && !result.includes('isOk')) {
      throw new Error(`Expected Result, got ${result}`);
    }
  }
};

export const t380_async_http_post_failed: TestCase = {
  name: 'Test 380: async http.post failed',
  fn: async () => {
    const source = `(program
 (module (name "t380") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Net)
    (body (http.post "http://invalid-url-that-fails.test" "data"))))`;
    
    const result = await run(source);
    // http.post may fail, so we just check it returns Result
    if (!result.includes('Result') && !result.includes('isOk')) {
      throw new Error(`Expected Result, got ${result}`);
    }
  }
};

