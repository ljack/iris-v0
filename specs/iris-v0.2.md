IRIS v0.2 spec delta: Effects lattice + inference
1) Effect set and ordering

Effects form a small lattice:

!Pure (no side effects)

!IO (filesystem/console)

!Any (top)

Order:

!Pure ≤ !IO ≤ !Any

Join (least upper bound):

join(!Pure, !Pure) = !Pure

join(!Pure, !IO) = !IO

join(!IO, !IO) = !IO

join(x, !Any) = !Any

(commutative/associative)

2) Inference rule (the key change)

Every expression is typechecked as:

Γ ⊢ e : T ! ε

Meaning: expression e has type T and requires effect ε.

Effect inference rules (minimal and deterministic):

Literals / variables: !Pure

(+ a b) etc: join(eff(a), eff(b))

(let (x e1) e2): join(eff(e1), eff(e2))

(if c t f): join(eff(c), join(eff(t), eff(f)))

(match scrut cases...): join(eff(scrut), join(all case bodies))

(f args...): join(eff(args...), eff(f))

(io.read_file ...), (io.write_file ...), (io.print ...): !IO (plus joins of their args, if you want to be strict)

3) Function declarations: “declared effect must cover inferred effect”

Keep your existing syntax:

(deffn (name X) ... (eff !Pure|!IO|!Any) (body ...))


New rule:

Let ε_inferred be the inferred effect of the body.

The function is valid iff ε_inferred ≤ ε_declared.

If not: TypeError: EffectMismatch: ...

4) Optional convenience: inferred effect annotation

Add a new allowed value:

(eff !Infer)

Semantics:

If !Infer, treat the declared effect as exactly the inferred effect (and store it if you want, for debugging).

This is purely to reduce boilerplate and AI token waste.

(You can implement v0.2 without !Infer, but it’s a cheap win for “AI-only”.)

5) What does this buy you?

AIs can freely over-approximate with !Any, but the system can also infer minimal effects and reject accidental IO leakage.

Refactors become safe: moving an io.* into a helper forces the helper’s effect (and callers’) to update or fail.

v0.2 test additions (focused on lattice + inference)

Add tests t21–t30. These assume your language already has function calls, if, and io.read_file, plus the effect mismatch failure format.

t21: Pure can call Pure

expect: 3

(program
 (module (name "t21") (version 0))
 (defs
  (deffn (name p) (args) (ret I64) (eff !Pure) (body (+ 1 2)))
  (deffn (name main) (args) (ret I64) (eff !Pure) (body (p)))))

t22: Pure calling IO function is rejected

expect: TypeError: EffectMismatch:

(program
 (module (name "t22") (version 0))
 (defs
  (deffn (name ioer)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (ioer)))))

t23: Declared !IO can call Pure

expect: 3

(program
 (module (name "t23") (version 0))
 (defs
  (deffn (name p) (args) (ret I64) (eff !Pure) (body (+ 1 2)))
  (deffn (name main) (args) (ret I64) (eff !IO) (body (p)))))

t24: Declared !Any can call IO

fs: {"/a.txt": "hello"}
expect: (Ok "hello")

(program
 (module (name "t24") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Any)
    (body (io.read_file "/a.txt")))))

t25: Inference through if-branches (IO in one branch)

Pure-declared should fail because inferred is !IO.
expect: TypeError: EffectMismatch:

(program
 (module (name "t25") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body
      (if true
          (io.read_file "/a.txt")
          (Ok "x"))))))

t26: Same as t25 but declared !IO succeeds

fs: {"/a.txt": "hello"}
expect: (Ok "hello")

(program
 (module (name "t26") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body
      (if true
          (io.read_file "/a.txt")
          (Ok "x"))))))

t27: Inference through let-binding (IO in bound expr)

Pure-declared should fail.
expect: TypeError: EffectMismatch:

(program
 (module (name "t27") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body
      (let (x (io.read_file "/a.txt"))
        x)))))

t28: Helper hides IO → must still propagate

expect: TypeError: EffectMismatch:

(program
 (module (name "t28") (version 0))
 (defs
  (deffn (name helper)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))
  (deffn (name wrapper)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (helper)))
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (wrapper)))))

t29: !Infer (if you implement it): pure body infers !Pure

expect: 3

(program
 (module (name "t29") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Infer)
    (body (+ 1 2)))))

t30: !Infer should infer !IO if body uses IO

fs: {"/a.txt": "hello"}
expect: (Ok "hello")

(program
 (module (name "t30") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Infer)
    (body (io.read_file "/a.txt")))))


If you don’t want to implement !Infer yet: skip t29–t30 and you still have a solid v0.2.

Implementation note (minimal change approach)

You likely already compute “usesIO” booleans. Replace it with an Effect enum and a join() function; propagate in the typechecker alongside types. Then check inferred ≤ declared.

To review your sexp.ts

Please paste the “Raw” URL for that file (or paste the file contents). The blob URL can’t be read reliably from here.

Once you do, I’ll:

verify location tracking and RParen errors are correct,

check ambiguity around strings/symbols,

and propose any parser hardening that helps v0.2 (especially around !Infer and new effect tokens).