Type system adversaries (None / unification / match typing)
t32 — None must unify to different Option types in different contexts

Goal: catch hardcoded None: Option<Bool> bug.
expect: (Some 1)

(program
 (module (name "t32") (version 0))
 (defs
  (deffn (name choose)
   (args (flag Bool))
   (ret (Option I64))
   (eff !Pure)
   (body (if flag (Some 1) None)))
  (deffn (name main)
   (args) (ret (Option I64)) (eff !Pure)
   (body (choose true))))))

t33 — Same None used in two branches with different inner types must be rejected

expect: TypeError: (must fail)

(program
 (module (name "t33") (version 0))
 (defs
  (deffn (name main)
   (args) (ret (Option I64)) (eff !Pure)
   (body (if true None (Some "x"))))))

t34 — match must bind correct type (Option<I64>)

expect: 2

(program
 (module (name "t34") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body
    (match (Some 2)
     (case (tag "Some" (v)) (+ v 0))
     (case (tag "None") 0)))))))

t35 — match variable used with wrong type must fail

expect: TypeError:

(program
 (module (name "t35") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body
    (match (Some 2)
     (case (tag "Some" (v)) (+ v "nope"))
     (case (tag "None") 0)))))))

t36 — match exhaustiveness: missing case should fail (if you enforce)

If you don’t enforce exhaustiveness yet, skip this test.
expect: TypeError: (non-exhaustive match)

(program
 (module (name "t36") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body
    (match None
     (case (tag "Some" (v)) v)))))))

t37 — Result match typing (Ok branch I64, Err branch Str) must unify to a single ret

expect: TypeError: (branches return different types)

(program
 (module (name "t37") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body
    (match (Err "x")
     (case (tag "Ok" (v)) v)
     (case (tag "Err" (e)) e)))))))

Effect inference adversaries (join, latent calls, dead branches)
t38 — Effect of if must join both branches, even if condition is constant true

Goal: catch optimizers/constant folders in typechecker.
expect: TypeError: EffectMismatch (because declared Pure but IO exists in dead branch)

(program
 (module (name "t38") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body (if true 1 (io.print "dead"))))))

t39 — Effect must flow through let-binding

expect: TypeError: EffectMismatch

(program
 (module (name "t39") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body (let (x (io.print "nope")) 1))))))

t40 — Calling an IO function from Pure must fail, even if IO result unused

expect: TypeError: EffectMismatch

(program
 (module (name "t40") (version 0))
 (defs
  (deffn (name side)
   (args) (ret Bool) (eff !IO)
   (body (io.print "hi")))
  (deffn (name main)
   (args) (ret I64) (eff !Pure)
   (body (let (u (side)) 0))))))

t41 — !Infer should resolve to !IO when body does IO (inferred)

expect: (Ok true) or true depending on your io.print return convention
(If your io.print returns true, expect true.)

(program
 (module (name "t41") (version 0))
 (defs
  (deffn (name main)
   (args) (ret Bool) (eff !Infer)
   (body (io.print "hello"))))))

t42 — !Infer should remain !Pure for pure body

expect: 3

(program
 (module (name "t42") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !Infer)
   (body (+ 1 2))))))

t43 — Effect join: Pure + IO => IO (declared !IO OK)

expect: 1

(program
 (module (name "t43") (version 0))
 (defs
  (deffn (name main)
   (args) (ret I64) (eff !IO)
   (body (if false (io.print "x") 1))))))

IO adversaries (empty file, overwrite, deterministic fs semantics)
t44 — read empty file must succeed

fs: {"/e.txt": ""}
expect: (Ok "")

(program
 (module (name "t44") (version 0))
 (defs
  (deffn (name main)
   (args) (ret (Result Str Str)) (eff !IO)
   (body (io.read_file "/e.txt"))))))

t45 — write then read back must round-trip

fs: {}
expect: (Ok "data")

(program
 (module (name "t45") (version 0))
 (defs
  (deffn (name main)
   (args) (ret (Result Str Str)) (eff !IO)
   (body
    (match (io.write_file "/x.txt" "data")
     (case (tag "Ok" (v))
      (io.read_file "/x.txt"))
     (case (tag "Err" (e))
      (Err e))))))))

t46 — write empty content then read must return empty string

expect: (Ok "")

(program
 (module (name "t46") (version 0))
 (defs
  (deffn (name main)
   (args) (ret (Result Str Str)) (eff !IO)
   (body
    (match (io.write_file "/z.txt" "")
     (case (tag "Ok" (v)) (io.read_file "/z.txt"))
     (case (tag "Err" (e)) (Err e))))))))

Printer adversaries (escaping, stability, records)
t47 — string escaping must be exact (quote, backslash, newline, tab)

expect: "q\"\\\n\t"
(that is: q, quote, backslash, newline, tab)

(program
 (module (name "t47") (version 0))
 (defs
  (deffn (name main)
   (args) (ret Str) (eff !Pure)
   (body "q\"\\\n\t")))))

t48 — record printing must sort keys lexicographically (including underscores)

expect: (record (a 1) (a_ 2) (b 3))

(program
 (module (name "t48") (version 0))
 (defs
  (deffn (name main)
   (args) (ret (Record (a I64) (a_ I64) (b I64))) (eff !Pure)
   (body (record (b 3) (a_ 2) (a 1)))))))

t49 — nested records must sort at every level

expect: (record (outer (record (a 1) (z 2))))

(program
 (module (name "t49") (version 0))
 (defs
  (deffn (name main)
   (args)
   (ret (Record (outer (Record (a I64) (z I64)))))
   (eff !Pure)
   (body (record (outer (record (z 2) (a 1)))))))))

“Semantic trap” tests (evaluation order, strictness)
t50 — strict evaluation: argument evaluated before call (IO should happen)

If you don’t assert print output, just ensure type/effect is IO and program runs.
expect: 0

(program
 (module (name "t50") (version 0))
 (defs
  (deffn (name id)
   (args (x I64)) (ret I64) (eff !Pure)
   (body x))
  (deffn (name main)
   (args) (ret I64) (eff !IO)
   (body (id (let (u (io.print "arg")) 0)))))))

t51 — strict match scrutinee evaluation (IO in scrutinee)

expect: 1

(program
 (module (name "t51") (version 0))
 (defs
  (deffn (name mk)
   (args) (ret (Option I64)) (eff !IO)
   (body (let (u (io.print "mk")) (Some 1))))
  (deffn (name main)
   (args) (ret I64) (eff !IO)
   (body
    (match (mk)
     (case (tag "Some" (v)) v)
     (case (tag "None") 0)))))))

Fuel / totality adversaries
t52 — fuel exhaustion should short-circuit to None (propagate)

expect: None

(program
 (module (name "t52") (version 0))
 (defs
  (deffn (name fib)
   (args (n I64) (fuel I64))
   (ret (Option I64))
   (eff !Pure)
   (body
    (if (= fuel 0)
     None
     (if (<= n 1)
      (Some n)
      (match (fib (- n 1) (- fuel 1))
       (case (tag "None") None)
       (case (tag "Some" (a))
        (match (fib (- n 2) (- fuel 1))
         (case (tag "None") None)
         (case (tag "Some" (b)) (Some (+ a b)))))))))))
  (deffn (name main)
   (args) (ret (Option I64)) (eff !Pure)
   (body (fib 10 1))))))

t53 — fuel just enough should succeed (boundary)

expect: (Some 2) (fib(3)=2)

(program
 (module (name "t53") (version 0))
 (defs
  (deffn (name fib)
   (args (n I64) (fuel I64))
   (ret (Option I64))
   (eff !Pure)
   (body
    (if (= fuel 0) None
     (if (<= n 1) (Some n)
      (match (fib (- n 1) (- fuel 1))
       (case (tag "None") None)
       (case (tag "Some" (a))
        (match (fib (- n 2) (- fuel 1))
         (case (tag "None") None)
         (case (tag "Some" (b)) (Some (+ a b)))))))))))
  (deffn (name main)
   (args) (ret (Option I64)) (eff !Pure)
   (body (fib 3 20))))))

Parser adversaries (tokenization, parentheses, strings)
t54 — parentheses in strings are not syntax

expect: "()()"

(program
 (module (name "t54") (version 0))
 (defs
  (deffn (name main)
   (args) (ret Str) (eff !Pure)
   (body "()()")))))

t55 — stray extra tokens after program must be parse error

If your runner only parses one form and ignores tail, this catches it.
expect: ParseError:

(program
 (module (name "t55") (version 0))
 (defs
  (deffn (name main) (args) (ret I64) (eff !Pure) (body 1))))
junk

How to use these

Add t32–t55.

Run npm test.

Paste back the first failing test’s:

program

expected vs actual

error message

What typically fails first

None typing (t32/t33)

effect join across constant if (t38)

io.read_file empty string (t44/t46)

parse-tail handling (t55)