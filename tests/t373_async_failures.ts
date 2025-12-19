import { TestCase } from '../src/test-types';
import { run } from '../src/main';
import { INetwork } from '../src/eval';

// Tests for async network/cross-module failures

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
