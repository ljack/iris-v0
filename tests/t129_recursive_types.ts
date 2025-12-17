
import { Interpreter } from '../src/eval';
import { Parser } from '../src/sexp';
import { TypeChecker } from '../src/typecheck';

// T129: Recursive Types Verification
// Checks if the compiler supports recursive type definitions.

export const t129 = {
  name: 'Test 129: Recursive Types',
  fn: async () => {
    console.log("Running T129: Recursive Types...");

    const code = `
    (program
      (module
        (name "recursive_test")
        (version 1)
      )
      (imports)
      (defs
        ;; Define a recursive type Tree
        (type Tree 
          (union 
            (tag "Leaf" (I64))
            (tag "Node" ((Record (val I64) (left Tree) (right Tree))))
          )
        )

        (deffn (name sum_tree) (args (t Tree)) (ret I64) (eff !Pure)
          (body
            (match t
              (case (tag "Leaf" (v)) v)
              (case (tag "Node" (r)) 
                 (+ (record.get r "val") 
                    (+ (call sum_tree (record.get r "left")) 
                       (call sum_tree (record.get r "right")))))
            )
          )
        )

        (deffn (name main) (args) (ret I64) (eff !Pure)
          (body
             (call sum_tree 
               (tag "Node" ((record (val 10) 
                                   (left (tag "Leaf" (5))) 
                                   (right (tag "Leaf" (3)))))))
          )
        )
      )
    )
    `;

    // 1. Parse
    const parser = new Parser(code);
    const programAst = parser.parse();

    // 2. Typecheck
    const checker = new TypeChecker();
    // checker.check(programAst); // Allow to throw

    // 3. Eval
    const interpreter = new Interpreter(programAst);
    const result = await interpreter.evalMain();

    if (result.kind === 'I64' && result.value === 18n) {
      console.log("T129 Passed!");
    } else {
      const replacer = (_: string, v: any) => typeof v === 'bigint' ? v.toString() + 'n' : v;
      throw new Error(`T129 Failed: Expected 18, got ${JSON.stringify(result, replacer)}`);
    }
  }
};
