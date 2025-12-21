import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';
import { Interpreter, INetwork } from '../src/eval';

// Mock network for testing
class TestNetwork implements INetwork {
  async listen(port: number): Promise<number | null> {
    return 1;
  }
  async accept(serverHandle: number): Promise<number | null> {
    return 2;
  }
  async read(handle: number): Promise<string | null> {
    return "GET / HTTP/1.1\r\n\r\n";
  }
  async write(handle: number, data: string): Promise<boolean> {
    return true;
  }
  async close(handle: number): Promise<boolean> {
    return true;
  }
  async connect(host: string, port: number): Promise<number | null> {
    return 3;
  }
}

// Tests for network operations
export const t243_net_listen: TestCase = {
  name: 'Test 243: net.listen',
  fn: async () => {
    const source = `(program
 (module (name "t243") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.listen 8080)))))`;

    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);

    const net = new TestNetwork();
    const interpreter = new Interpreter(program, {}, undefined, net);
    const result = await interpreter.evalMain();

    if (result.kind !== 'Result' || !result.isOk || result.value.kind !== 'I64') {
      throw new Error(`Expected Ok(1), got ${JSON.stringify(result)}`);
    }
  }
};

export const t244_net_accept: TestCase = {
  name: 'Test 244: net.accept',
  fn: async () => {
    const source = `(program
 (module (name "t244") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server)) (net.accept server))
        (case (tag "Err" (e)) (Err e)))))))`;

    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);

    const net = new TestNetwork();
    const interpreter = new Interpreter(program, {}, undefined, net);
    const result = await interpreter.evalMain();

    if (result.kind !== 'Result' || !result.isOk || result.value.kind !== 'I64') {
      throw new Error(`Expected Ok(2), got ${JSON.stringify(result)}`);
    }
  }
};

export const t245_net_read_write: TestCase = {
  name: 'Test 245: net.read and net.write',
  fn: async () => {
    const source = `(program
 (module (name "t245") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Net)
    (body
      (match (net.listen 8080)
        (case (tag "Ok" (server))
          (match (net.accept server)
            (case (tag "Ok" (client))
              (match (net.read client)
                (case (tag "Ok" (data))
                  (match (net.write client "HTTP/1.1 200 OK\\r\\n\\r\\n")
                    (case (tag "Ok" (_)) (Ok data))
                    (case (tag "Err" (e)) (Err e))))
                (case (tag "Err" (e)) (Err e))))
            (case (tag "Err" (e)) (Err e))))
        (case (tag "Err" (e)) (Err e)))))))`;

    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);

    const net = new TestNetwork();
    const interpreter = new Interpreter(program, {}, undefined, net);
    const result = await interpreter.evalMain();

    if (result.kind !== 'Result' || !result.isOk || result.value.kind !== 'Str') {
      throw new Error(`Expected Ok("GET / HTTP/1.1..."), got ${JSON.stringify(result)}`);
    }
  }
};

export const t246_net_connect: TestCase = {
  name: 'Test 246: net.connect',
  fn: async () => {
    const source = `(program
 (module (name "t246") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Net)
    (body (net.connect "example.com" 80)))))`;

    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);

    const net = new TestNetwork();
    const interpreter = new Interpreter(program, {}, undefined, net);
    const result = await interpreter.evalMain();

    if (result.kind !== 'Result' || !result.isOk || result.value.kind !== 'I64') {
      throw new Error(`Expected Ok(3), got ${JSON.stringify(result)}`);
    }
  }
};

// Tests for concurrency operations
export const t247_sys_self: TestCase = {
  name: 'Test 247: sys.self',
  expect: '1',
  source: `(program
 (module (name "t247") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Net)
    (body (sys.self)))))`
};

export const t248_sys_send_recv: TestCase = {
  name: 'Test 248: sys.send and sys.recv',
  expect: '"hello"',
  source: `(program
 (module (name "t248") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Net)
    (body
      (let (pid (sys.self))
        (let (sent (sys.send pid "hello"))
          (sys.recv)))))))`
};

export const t249_http_post: TestCase = {
  name: 'Test 249: http.post',
  expect: '(Ok (record (body "OK") (headers (list )) (status 200) (version "HTTP/1.1")))',
  source: `(program
 (module (name "t249") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result (Record (version Str) (status I64) (headers (List (Record (key Str) (val Str)))) (body Str)) Str))
    (eff !Net)
    (body (http.post "http://example.com" "test")))))`
};

export const t250_io_file_exists: TestCase = {
  name: 'Test 250: io.file_exists',
  fn: async () => {
    const source = `(program
 (module (name "t250") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !IO)
    (body (io.file_exists "test.txt")))))`;

    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);

    const interpreter = new Interpreter(program, { 'test.txt': 'content' });
    const result = await interpreter.evalMain();

    if (result.kind !== 'Bool' || result.value !== true) {
      throw new Error(`Expected true, got ${JSON.stringify(result)}`);
    }
  }
};

export const t251_io_write_file: TestCase = {
  name: 'Test 251: io.write_file',
  fn: async () => {
    const source = `(program
 (module (name "t251") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !IO)
    (body (io.write_file "output.txt" "hello")))))`;

    const parser = new Parser(source);
    const program = parser.parse();
    const checker = new TypeChecker();
    checker.check(program);

    const fs: Record<string, string> = {};
    const interpreter = new Interpreter(program, fs);
    const result = await interpreter.evalMain();

    if (result.kind !== 'Result' || !result.isOk || result.value.kind !== 'I64') {
      throw new Error(`Expected Ok(5), got ${JSON.stringify(result)}`);
    }
    if (fs['output.txt'] !== 'hello') {
      throw new Error(`File not written correctly`);
    }
  }
};
