
import { TestCase } from '../src/test-types';
import { ProcessManager } from '../src/runtime/process';
import { check } from '../src/main';

export const t396_runtime_coverage: TestCase = {
    name: 'Test 396: Runtime & Main Coverage',
    fn: async () => {
        // --- ProcessManager Coverage ---
        const pm = ProcessManager.instance;
        pm.reset();

        // 1. Send to non-existent PID
        if (pm.send(999, "msg") !== false) throw new Error("send to non-existent PID should return false");

        // 2. Recv from non-existent PID
        try {
            await pm.recv(999);
            throw new Error("recv from non-existent PID should throw");
        } catch (e: any) { if (!e.message.includes('not registered')) throw e; }


        // --- Main Check/Resolver Coverage ---
        // 3. Resolver parsing error
        const modules = {
            'bad': ' ( invalid syntax '
        };
        // Use verbose syntax: (imports (import "bad" (as "b")))
        const src = `(program 
            (module (name "MainFirst") (version 1))
            (imports (import "bad" (as "b"))) 
            (defs 
                (defconst (name main) (type I64) (value 0))
            )
        )`;

        // This should invoke the resolver's try/catch block around parse
        const res = check(src, modules);
        if (res.success) throw new Error("Should fail due to bad module");

        // 4. Resolver Cache Hit (Diamond Dependency)
        // Main imports A and B.
        // A imports C.
        // B imports C.
        // resolver should hit cache for C the second time.
        const diamondModules = {
            'A': `(program 
                (module (name "A") (version 1)) 
                (imports (import "C" (as "c"))) 
                (defs (defconst (name a) (type I64) (value 1)))
            )`,
            'B': `(program 
                (module (name "B") (version 1)) 
                (imports (import "C" (as "c"))) 
                (defs (defconst (name b) (type I64) (value 2)))
            )`,
            'C': `(program 
                (module (name "C") (version 1)) 
                (imports) 
                (defs (defconst (name c) (type I64) (value 3)))
            )`
        };
        const diamondSrc = `(program 
            (module (name "Main") (version 1)) 
            (imports (import "A" (as "a")) (import "B" (as "b"))) 
            (defs (defconst (name main) (type I64) (value 0)))
        )`;

        const res2 = check(diamondSrc, diamondModules);
        if (!res2.success) throw new Error(`Diamond test failed: ${res2.error}`);
        // This ensures resolver was called and likely cache was hit.

        console.log("Runtime Coverage Passed");
    }
};
