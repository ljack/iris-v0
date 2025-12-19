import { TestCase } from '../src/test-types';

// Advanced tests for sync evaluation - Error Types and IO Sync Handlers

export const t259_sync_tuple_access_error: TestCase = {
    name: 'Test 259: sync tuple access error',
    expect: 'TypeError: Tuple index out of bounds: 100',
    source: `(program
 (module (name "t259") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2))
        (let (val t.100)
          val))))))`
};

export const t260_sync_record_field_error: TestCase = {
    name: 'Test 260: sync record field error',
    expect: 'TypeError: Unknown field nonexistent in record',
    source: `(program
 (module (name "t260") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x 42)))
        (let (val r.nonexistent)
          val))))))`
};

export const t261_sync_unknown_variable: TestCase = {
    name: 'Test 261: sync unknown variable',
    expect: 'TypeError: Unknown variable: nonexistent',
    source: `(program
 (module (name "t261") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body nonexistent))))`
};

export const t262_sync_if_condition_error: TestCase = {
    name: 'Test 262: sync if condition error',
    expect: 'TypeError: Type Error in If condition: Expected Bool, got I64',
    source: `(program
 (module (name "t262") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if 42 10 20)))))`
};

export const t263_sync_arithmetic_error: TestCase = {
    name: 'Test 263: sync arithmetic type error',
    expect: 'TypeError: Type Error in + operand 1: Expected I64, got Str',
    source: `(program
 (module (name "t263") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ "hello" 1)))))`
};

export const t264_sync_io_read_file: TestCase = {
    name: 'Test 264: sync io.read_file',
    expect: '(Ok "hello")',
    source: `(program
 (module (name "t264") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "test.txt")))))`,
    fs: { 'test.txt': 'hello' }
};

export const t265_sync_io_file_exists: TestCase = {
    name: 'Test 265: sync io.file_exists',
    expect: 'true',
    source: `(program
 (module (name "t265") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !IO)
    (body (io.file_exists "test.txt")))))`,
    fs: { 'test.txt': 'content' }
};

export const t266_sync_io_print: TestCase = {
    name: 'Test 266: sync io.print',
    expect: '0',
    expectOutput: ['test'],
    source: `(program
 (module (name "t266") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !IO)
    (body (io.print "test")))))`
};

export const t267_sync_async_intrinsic_error: TestCase = {
    name: 'Test 267: sync async intrinsic error',
    expect: 'TypeError: EffectMismatch: Function main: Inferred !Net but declared !IO',
    source: `(program
 (module (name "t267") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !IO)
    (body (net.listen 8080)))))`
};
