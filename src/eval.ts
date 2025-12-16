import { Program, Definition, Expr, Value, IntrinsicOp, MatchCase, ModuleResolver } from './types';


export interface IFileSystem {
    readFile(path: string): string | null; // null if not found/error
    writeFile(path: string, content: string): boolean;
    exists(path: string): boolean;
}

class MockFileSystem implements IFileSystem {
    constructor(private data: Record<string, string>) { }
    readFile(path: string) { return this.data[path] ?? null; }
    writeFile(path: string, content: string) { this.data[path] = content; return true; }
    exists(path: string) { return path in this.data; }
}

export class Interpreter {
    private program: Program;
    private functions = new Map<string, Definition & { kind: 'DefFn' }>();
    private constants = new Map<string, Value>();
    private fs: IFileSystem;

    constructor(program: Program, fs: Record<string, string> | IFileSystem = {}, private resolver?: ModuleResolver) {
        this.program = program;
        // Backwards compatibility with tests passing Record
        if (typeof fs.readFile === 'function') {
            this.fs = fs as IFileSystem;
        } else {
            this.fs = new MockFileSystem(fs as Record<string, string>);
        }

        for (const def of program.defs) {
            if (def.kind === 'DefFn') {
                this.functions.set(def.name, def);
            }
        }
    }

    evalMain(): Value {
        // initialize constants
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, this.evalExpr(def.value, new Map()));
            }
        }

        const main = this.functions.get('main');
        if (!main) throw new Error("No main function defined");

        return this.evalExpr(main.body, new Map());
    }

    // Public method to call a specific function with values
    callFunction(name: string, args: Value[]): Value {
        // Init constants first if not done? 
        // Ideally constants are lazy or init on constructor? 
        // For v0.4, let's init constants on first call or constructor.
        // Or re-init. Re-init is wasteful but safe.
        // Better: this.initConstants();
        this.initConstants();

        const func = this.functions.get(name);
        if (!func) throw new Error(`Unknown function: ${name}`);
        if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);

        const newEnv = new Map<string, Value>();
        for (let i = 0; i < args.length; i++) {
            newEnv.set(func.args[i].name, args[i]);
        }
        return this.evalExpr(func.body, newEnv);
    }

    private initConstants() {
        if (this.constants.size > 0) return; // Already done? 
        // Actually constants map might be empty if no constants.
        // We need a flag.
        // For now, just re-run safe if idempotent.
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, this.evalExpr(def.value, new Map()));
            }
        }
    }

    private evalExpr(expr: Expr, env: Map<string, Value>): Value {
        switch (expr.kind) {
            case 'Literal':
                return expr.value;

            case 'Var': {
                const v = env.get(expr.name);
                if (v !== undefined) return v;
                const c = this.constants.get(expr.name);
                if (c !== undefined) return c;
                throw new Error(`Runtime Unknown variable: ${expr.name}`);
            }

            case 'Let': {
                const val = this.evalExpr(expr.value, env);
                const newEnv = new Map(env);
                newEnv.set(expr.name, val);
                return this.evalExpr(expr.body, newEnv);
            }

            case 'If': {
                const cond = this.evalExpr(expr.cond, env);
                if (cond.kind !== 'Bool') throw new Error("If condition must be Bool");
                if (cond.value) {
                    return this.evalExpr(expr.then, env);
                } else {
                    return this.evalExpr(expr.else, env);
                }
            }

            case 'Call': {
                let func = this.functions.get(expr.fn);

                if (!func && expr.fn.includes('.')) {
                    const [alias, fname] = expr.fn.split('.');
                    const importDecl = this.program.imports.find(i => i.alias === alias);
                    if (importDecl && this.resolver) {
                        const importedProg = this.resolver(importDecl.path);
                        if (importedProg) {
                            const targetDef = importedProg.defs.find(d => d.kind === 'DefFn' && d.name === fname) as any;
                            if (targetDef) {
                                // For evaluation, we basically need to switch context to that module?
                                // But v0.4 is pure and stateless except IO.
                                // Recursive call via new interpreter or simple substitution?
                                // Simplest: Create new Interpreter for that module and run evalExpr.
                                // But we need to pass arguments.
                                func = targetDef;
                                // We can't just set func = targetDef because evalExpr expects `func` to be in `this.functions`?
                                // Use a trick: Evaluate arguments here, then spawn sub-interpreter.
                            }
                        }
                    }
                }

                if (!func) throw new Error(`Unknown function: ${expr.fn}`);

                // Evaluate args in current scope
                const args = expr.args.map(a => this.evalExpr(a, env));

                if (expr.fn.includes('.')) {
                    // It's a cross-module call.
                    const [alias, fname] = expr.fn.split('.');
                    const importDecl = this.program.imports.find(i => i.alias === alias);
                    if (importDecl && this.resolver) {
                        const importedProg = this.resolver(importDecl.path)!;
                        // New interpreter instance for the other module
                        // Share FS? Yes. Share resolver? Yes.
                        const subInterp = new Interpreter(importedProg, this.fs, this.resolver);
                        // We need to inject arguments.
                        // We can't use evalMain. We need evalExpr on loop.
                        // We need access to subInterp methods.
                        return subInterp.callFunction(fname, args);
                    }
                }

                if (args.length !== func.args.length) throw new Error(`Arity mismatch for ${expr.fn}`);

                // Create new env for function body
                const newEnv = new Map<string, Value>();
                for (let i = 0; i < args.length; i++) {
                    newEnv.set(func.args[i].name, args[i]);
                }

                // Recurse checks
                // Fuel checks? If we implement helper, pass fuel logic.
                // Assuming fuel is managed via `recur` which is separate AST node.
                // If the called function is just a DefFn, it's just a body evaluation.

                return this.evalExpr(func.body, newEnv);
            }

            case 'Match': {
                const target = this.evalExpr(expr.target, env);

                // Find matching case
                for (const c of expr.cases) {
                    // Check tag match
                    let match = false;
                    let newBindings = new Map(env); // This copy is slightly inefficient but safe

                    if (target.kind === 'Option') {
                        if (c.tag === 'None' && target.value === null) match = true;
                        else if (c.tag === 'Some' && target.value !== null) {
                            match = true;
                            if (c.vars.length > 0) newBindings.set(c.vars[0], target.value);
                        }
                    } else if (target.kind === 'Result') {
                        if (c.tag === 'Ok' && target.isOk) {
                            match = true;
                            if (c.vars.length > 0) newBindings.set(c.vars[0], target.value);
                        } else if (c.tag === 'Err' && !target.isOk) {
                            match = true;
                            if (c.vars.length > 0) newBindings.set(c.vars[0], target.value);
                        }
                    }

                    if (match) {
                        return this.evalExpr(c.body, newBindings);
                    }
                }
                throw new Error(`No matching case for value ${JSON.stringify(target)}`);
            }

            case 'Record': {
                const fields: Record<string, Value> = {};
                for (const [key, valExpr] of Object.entries(expr.fields)) {
                    fields[key] = this.evalExpr(valExpr, env);
                }
                return { kind: 'Record', fields };
            }

            case 'Intrinsic':
                return this.evalIntrinsic(expr.op, expr.args.map(a => this.evalExpr(a, env)));

            default:
                throw new Error(`Unimplemented eval for ${expr.kind}`);
        }
    }

    private evalIntrinsic(op: IntrinsicOp, args: Value[]): Value {
        if (['+', '-', '*', '/', '<=', '<', '='].includes(op)) {
            const v1 = args[0];
            const v2 = args[1];
            if (v1.kind !== 'I64' || v2.kind !== 'I64') throw new Error("Math expects I64");
            const a = v1.value;
            const b = v2.value;

            switch (op) {
                case '+': return { kind: 'I64', value: a + b };
                case '-': return { kind: 'I64', value: a - b };
                case '*': return { kind: 'I64', value: a * b };
                case '/': {
                    if (b === 0n) throw new Error("Division by zero");
                    return { kind: 'I64', value: a / b };
                }
                case '<=': return { kind: 'Bool', value: a <= b };
                case '<': return { kind: 'Bool', value: a < b };
                case '=': return { kind: 'Bool', value: a === b };
            }
        }

        if (op === 'Some') {
            return { kind: 'Option', value: args[0] };
        }

        if (op === 'Ok') return { kind: 'Result', isOk: true, value: args[0] };
        if (op === 'Err') return { kind: 'Result', isOk: false, value: args[0] }; // Value is the error string or obj

        if (op === 'io.read_file') {
            const path = args[0];
            if (path.kind !== 'Str') throw new Error("path must be string");
            const content = this.fs.readFile(path.value);
            if (content !== null) {
                return { kind: 'Result', isOk: true, value: { kind: 'Str', value: content } };
            } else {
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "ENOENT" } };
            }
        }

        if (op === 'io.write_file') {
            const path = args[0];
            const content = args[1];
            if (path.kind !== 'Str') throw new Error("path must be string");
            if (content.kind !== 'Str') throw new Error("content must be string");
            this.fs.writeFile(path.value, content.value);
            return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(content.value.length) } };
        }

        if (op === 'io.file_exists') {
            const path = args[0];
            if (path.kind !== 'Str') throw new Error("path must be string");
            return { kind: 'Bool', value: this.fs.exists(path.value) };
        }

        if (op === 'io.print') {
            const val = args[0];
            if (val.kind === 'Str') {
                console.log(val.value);
            } else if (val.kind === 'I64' || val.kind === 'Bool') {
                console.log(val.value.toString());
            } else {
                console.log(JSON.stringify(val));
            }
            return { kind: 'I64', value: 0n }; // Return 0
        }

        if (op.startsWith('net.')) {
            // Stub network operations for now
            console.log(`[NET] Mock Executing ${op}`, args);
            // Default success for stubs
            if (op === 'net.listen' || op === 'net.accept' || op === 'net.write')
                return { kind: 'Result', isOk: true, value: { kind: 'I64', value: 1n } }; // handle 1
            if (op === 'net.read')
                return { kind: 'Result', isOk: true, value: { kind: 'Str', value: "GET /index.html HTTP/1.1\r\nHost: localhost\r\n\r\n" } };
            if (op === 'net.close')
                return { kind: 'Result', isOk: true, value: { kind: 'Bool', value: true } };
        }

        if (op === 'http.parse_request') {
            const raw = args[0];
            if (raw.kind !== 'Str') throw new Error("http.parse_request expects Str");
            const text = raw.value;

            try {
                const parts = text.split(/\r?\n\r?\n/); // Split head and body
                const head = parts[0];
                const body = parts.slice(1).join('\n\n'); // Rejoin body if needed? usually one body.

                const lines = head.split(/\r?\n/);
                if (lines.length === 0) throw new Error("Empty request");

                const reqLine = lines[0].split(' ');
                if (reqLine.length < 3) throw new Error("Invalid request line");
                const method = reqLine[0];
                const path = reqLine[1];
                // version is reqLine[2]

                const headers: Value[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) continue;
                    const idx = line.indexOf(':');
                    if (idx !== -1) {
                        const key = line.substring(0, idx).trim();
                        const val = line.substring(idx + 1).trim();
                        headers.push({
                            kind: 'Record',
                            fields: {
                                key: { kind: 'Str', value: key },
                                val: { kind: 'Str', value: val }
                            }
                        });
                    }
                }

                const reqRecord: Value = {
                    kind: 'Record',
                    fields: {
                        method: { kind: 'Str', value: method },
                        path: { kind: 'Str', value: path },
                        headers: { kind: 'List', items: headers },
                        body: { kind: 'Str', value: body }
                    }
                };

                return { kind: 'Result', isOk: true, value: reqRecord };
            } catch (e: any) {
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: e.message } };
            }
        }

        if (op === 'str.concat') {
            const s1 = args[0]; const s2 = args[1];
            if (s1.kind !== 'Str' || s2.kind !== 'Str') throw new Error("str.concat expects two strings");
            return { kind: 'Str', value: s1.value + s2.value };
        }

        if (op === 'str.contains') {
            const s1 = args[0]; const s2 = args[1];
            if (s1.kind !== 'Str' || s2.kind !== 'Str') throw new Error("str.contains expects two strings");
            return { kind: 'Bool', value: s1.value.includes(s2.value) };
        }

        if (op === 'str.ends_with') {
            const s1 = args[0]; const s2 = args[1];
            if (s1.kind !== 'Str' || s2.kind !== 'Str') throw new Error("str.ends_with expects two strings");
            return { kind: 'Bool', value: s1.value.endsWith(s2.value) };
        }

        throw new Error(`Unknown intrinsic ${op}`);
    }
}
