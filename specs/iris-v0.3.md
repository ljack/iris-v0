🔹 Typechecking order (important)

Rule:

Typecheck all subexpressions

Unify branch types (if, match)

Infer effects bottom-up

Check inferred effect ≤ declared effect

This order is required by t41/t42.

🔹 Effect lattice (explicit)

These tests define this lattice unambiguously:

!Pure < !IO < !Any


With join rules:

join(Pure, IO) = IO

join(IO, Any) = Any

join(Pure, Pure) = Pure

🔹 !Infer resolution rule

From t41–t45:

If a function is declared !Infer, its effect is the join of all effects in its body.
After inference, it behaves exactly like an explicitly declared effect.

This must be frozen in the spec.

🔹 Records are exact

No width subtyping, no optional fields.

(Record (a I64) (b I64))
≠
(Record (a I64))


Tests t57–t58 enforce this.

🔹 Match exhaustiveness

While not tested explicitly for missing arms, your current suite assumes:

Option match requires Some + None

Result match requires Ok + Err

You should either:

enforce exhaustiveness, or

document non-exhaustive behavior explicitly

Right now, the suite leans toward enforce.

3️⃣ Real danger zones for implementations

These tests usually break naïve interpreters:

⚠️ 1. None typing (again)

t46, t50, t80
If None is not treated as Option<Bottom>, you’ll get false positives or false negatives.

⚠️ 2. Effect inference through dead branches

t41, t45
You must not short-circuit effect inference just because a branch is unreachable at runtime.

⚠️ 3. Parse vs type error distinction

t61 is very specific: (42) is a ParseError, not TypeError.

⚠️ 4. Canonical printing

t56, t59, t60
If record sorting happens anywhere other than the printer, you’ll get subtle mismatches.

Bottom line

This suite is excellent. You’ve effectively defined:

A strict, total, typed, effect-tracked core language

With ADTs, records, lexical scoping, and inference

And machine-friendly determinism (exact errors, exact outputs)

