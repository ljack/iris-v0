import { Parser, printValue } from './sexp';
import { TypeChecker } from './typecheck';
import { Interpreter, IFileSystem, INetwork } from './eval';
import { ModuleResolver, Program } from './types';
import { ProcessManager } from './runtime/process';

// Helper to find imports without parsing everything?
// We need to parse to find imports.
function getImports(source: string): string[] {
    try {
        const parser = new Parser(source);
        const prog = parser.parse();
        return prog.imports.map(i => i.path);
    } catch {
        return [];
    }
}

function checkCircularImports(entryPath: string, modules: Record<string, string>) {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(path: string) {
        if (recursionStack.has(path)) {
            // Found a cycle!
            // We need to reconstruct the path for the error message?
            // "Cycle detected: modB -> modA ..." (simplification)
            // The path is implicit in recursionStack, but Set iteration order matches insertion in JS.
            // Let's find the cycle start.
            const stack = Array.from(recursionStack);
            const cycleStart = stack.indexOf(path);
            const cycle = stack.slice(cycleStart).concat(path).join(' -> ');
            throw new Error(`Circular import detected: ${cycle}`);
        }
        if (visited.has(path)) return;

        visited.add(path);
        recursionStack.add(path);

        const source = modules[path];
        if (source) {
            const imports = getImports(source);
            for (const imp of imports) {
                dfs(imp);
            }
        }

        recursionStack.delete(path);
    }

    // We don't check entryPath itself usually if it's "source" argument (not in modules map),
    // but the Source imports modules which might cycle.
    // The entry source is passed separately.
    // Let's assume entry imports X.
    // But we need to parse entry too.
    return; // logic moved to run()
}


// Helper to encapsulate program + resolver for interpreter
type CheckResult = { success: true, program: Program, resolver: ModuleResolver } | { success: false, error: string };

export function check(source: string, modules: Record<string, string> = {}): CheckResult {
    // 1. Parse
    const parser = new Parser(source);
    let program;
    try {
        program = parser.parse();
    } catch (e: any) {
        return { success: false, error: `ParseError: ${e.message}` };
    }

    // 1b. Check Circular Imports starting from main program
    try {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (path: string) => {
            if (recursionStack.has(path)) {
                // Construct nice message
                const stack = Array.from(recursionStack);
                const idx = stack.indexOf(path);
                const cycle = stack.slice(idx).concat(path).join(' -> ');
                throw new Error(`Circular import detected: ${cycle}`);
            }
            if (visited.has(path)) return;

            visited.add(path);
            recursionStack.add(path);

            const src = modules[path];
            if (src) {
                const p = new Parser(src);
                const pr = p.parse();
                for (const i of pr.imports) {
                    dfs(i.path);
                }
            }
            recursionStack.delete(path);
        };

        for (const i of program.imports) {
            dfs(i.path);
        }

    } catch (e: any) {
        return { success: false, error: `RuntimeError: ${e.message}` };
    }

    // Create caching resolver
    const cache = new Map<string, Program>();
    const resolver: ModuleResolver = (path: string) => {
        if (cache.has(path)) return cache.get(path);

        const modSource = modules[path];
        if (!modSource) return undefined;
        try {
            const p = new Parser(modSource);
            const pr = p.parse();
            cache.set(path, pr);
            return pr;
        } catch (e) {
            console.error(`Failed to parse module ${path}:`, e);
            return undefined;
        }
    };

    // 2. Typecheck
    const checker = new TypeChecker(resolver);
    try {
        checker.check(program);
    } catch (e: any) {
        if (e.message.startsWith('TypeError:')) {
            return { success: false, error: e.message };
        }
        return { success: false, error: `TypeError: ${e.message}` };
    }

    return { success: true, program, resolver };
}



// ... other imports

export async function run(source: string, fsMap: Record<string, string> | IFileSystem = {}, modules: Record<string, string> = {}, net?: INetwork): Promise<string> {
    ProcessManager.instance.reset(); // Reset concurrency state for fresh run
    const checked = check(source, modules);
    if (!checked.success) return checked.error;

    // 3. Interpret
    const interpreter = new Interpreter(checked.program, fsMap, checked.resolver, net);
    let result;
    try {
        result = await interpreter.evalMain();
    } catch (e: any) {
        return `RuntimeError: ${e.message}`;
    }

    return printValue(result);
}
