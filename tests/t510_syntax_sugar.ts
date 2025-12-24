import { TestCase } from '../src/test-types';

export const t510_let_star: TestCase = {
  name: 'Test 510: let* sequential bindings',
  expect: '4',
  source: `(program
 (module (name "t510") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let* ((x 1) (y (+ x 2)))
        (+ x y))))))`
};

export const t511_record_update: TestCase = {
  name: 'Test 511: record.update sugar',
  expect: '"b"',
  source: `(program
 (module (name "t511") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body
      (let* ((cfg (record (url "a") (verbose false)))
             (cfg (record.update cfg (url "b") (verbose true))))
        (record.get cfg "url"))))))`
};

export const t512_cond: TestCase = {
  name: 'Test 512: cond sugar',
  expect: '2',
  source: `(program
 (module (name "t512") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (cond
        (case false 1)
        (else 2))))))`
};

export const t513_do: TestCase = {
  name: 'Test 513: do sequencing',
  expect: '4',
  source: `(program
 (module (name "t513") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (do
        1
        2
        (+ 1 3))))))`
};

export const t515_dot_access: TestCase = {
  name: 'Test 515: dot access desugars to record.get',
  expect: '7',
  source: `(program
 (module (name "t515") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (env (record (bindings (record (x 7)))))
        env.bindings.x))))))`
};
