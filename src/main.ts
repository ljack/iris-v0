import { Parser, printValue } from "./sexp";
import { TypeChecker } from "./typecheck";
import { Interpreter, IFileSystem, INetwork, IToolHost } from "./eval";
import { ModuleResolver, Program } from "./types";
import { ProcessManager } from "./runtime/process";

// Helper to encapsulate program + resolver for interpreter
type CheckResult =
  | { success: true; program: Program; resolver: ModuleResolver }
  | { success: false; error: string };

export function check(
  source: string,
  modules: Record<string, string> = {},
  debug: boolean = false,
): CheckResult {
  // 1. Parse
  const parser = new Parser(source, debug);
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
        const cycle = stack.slice(idx).concat(path).join(" -> ");
        throw new Error(`Circular import detected: ${cycle}`);
      }
      if (visited.has(path)) return;

      visited.add(path);
      recursionStack.add(path);

      const src = modules[path];
      if (src) {
        try {
          // Note: Module parsing also uses debug? Maybe specific flag?
          // For now inherit debug flag.
          const p = new Parser(src, debug);
          const pr = p.parse();
          for (const i of pr.imports) {
            dfs(i.path);
          }
        } catch (e: any) {
          throw new Error(`In module '${path}': ${e.message}`);
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
      const p = new Parser(modSource, debug);
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
    if (e.message.startsWith("TypeError:")) {
      return { success: false, error: e.message };
    }
    return { success: false, error: `TypeError: ${e.message}` };
  }

  return { success: true, program, resolver };
}

// ... other imports

export async function run(
  source: string,
  fsMap: Record<string, string> | IFileSystem = {},
  modules: Record<string, string> = {},
  net?: INetwork,
  args: string[] = [],
  debug: boolean = false,
  tools?: IToolHost,
): Promise<string> {
  ProcessManager.instance.reset(); // Reset concurrency state for fresh run
  const checked = check(source, modules, debug);
  if (!checked.success) return checked.error as string;

  // 3. Interpret
  const interpreter = new Interpreter(
    checked.program,
    fsMap,
    checked.resolver,
    net,
    tools,
    undefined,
    args,
  );
  let result;
  try {
    result = await interpreter.evalMain();
  } catch (e: any) {
    return `RuntimeError: ${e.message}`;
  }

  return printValue(result);
}
