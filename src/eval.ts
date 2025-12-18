import { Program, Definition, Expr, Value, IntrinsicOp, MatchCase, ModuleResolver, LinkedEnv, IrisType } from './types';
import { ProcessManager } from './runtime/process';


export interface IFileSystem {
    readFile(path: string): string | null; // null if not found/error
    writeFile(path: string, content: string): boolean;
    exists(path: string): boolean;
    readDir?(path: string): string[] | null; // Optional
}

export interface INetwork {
    listen(port: number): Promise<number | null>;
    accept(serverHandle: number): Promise<number | null>;
    read(handle: number): Promise<string | null>;
    write(handle: number, data: string): Promise<boolean>;
    close(handle: number): Promise<boolean>;
    connect(host: string, port: number): Promise<number | null>;
}

class MockFileSystem implements IFileSystem {
    constructor(private data: Record<string, string>) { }
    readFile(path: string) { return this.data[path] ?? null; }
    writeFile(path: string, content: string) { this.data[path] = content; return true; }
    exists(path: string) { return path in this.data; }
    readDir(path: string) {
        if (path === '.') return Object.keys(this.data);
        return Object.keys(this.data).filter(k => k.startsWith(path + '/'));
    }
}

class MockNetwork implements INetwork {
    async listen(port: number) { return 1; }
    async accept(h: number) { return 2; } // Return a client handle
    async read(h: number) { return "GET / HTTP/1.1\r\n\r\n"; }
    async write(h: number, d: string) { return true; }
    async close(h: number) { return true; }
    async connect(host: string, port: number) { return 3; }
}



export class Interpreter {
    private program: Program;
    private functions = new Map<string, Definition & { kind: 'DefFn' }>();
    private constants = new Map<string, Value>();
    private fs: IFileSystem;
    private net: INetwork;

    private valueToKey(v: Value): string {
        if (v.kind === 'I64') return `I64:${v.value} `;
        if (v.kind === 'Str') return `Str:${v.value} `;
        if (v.kind === 'Tagged') {
            if (v.tag === 'Str') {
                // Determine if payload is simple Str or wrapped
                // Iris Value: (tag "Str" (Str)). Payload is Str value.
                if (v.value.kind === 'Str') return `Str:${v.value.value} `;
                // If payload is literal/expression wrapper in some cases?
                // Should only happen for Value types.
                // Fallback attempt to extract value
                if ((v.value as any).value && typeof (v.value as any).value === 'string') return `Str:${(v.value as any).value} `;
                return `Str:${JSON.stringify(v.value)} `;
            }
            if (v.tag === 'I64') {
                if (v.value.kind === 'I64') return `I64:${v.value.value} `;
                return `I64:${JSON.stringify(v.value)} `;
            }
            // For other tags, maybe use JSON stringify of the whole thing?
            return `Tagged:${v.tag}:${JSON.stringify(v.value, (_, val) => typeof val === 'bigint' ? val.toString() : val)} `;
        }
        throw new Error(`Runtime: Invalid map key type: ${v.kind} `);
    }

    private keyToValue(k: string): Value {
        if (k.startsWith('I64:')) {
            return { kind: 'I64', value: BigInt(k.substring(4)) };
        }
        if (k.startsWith('Str:')) {
            return { kind: 'Str', value: k.substring(4) };
        }
        if (k.startsWith('Tagged:')) {
            // Tagged:TAG:JSON
            const firstColon = k.indexOf(':');
            const secondColon = k.indexOf(':', firstColon + 1);
            if (secondColon === -1) throw new Error(`Runtime: Invalid tagged key format: ${k} `);
            const tag = k.substring(firstColon + 1, secondColon);
            const json = k.substring(secondColon + 1);
            const val = JSON.parse(json, (_, v) => {
                if (typeof v === 'string' && /^\d+n$/.test(v)) return BigInt(v.slice(0, -1));
                return v;
            });
            // We need to reconstruct Value from JSON? 
            // valueToKey used JSON.stringify(v.value).
            // But v.value might be I64 which becomes string "123n" or just number?
            // BigInt stringification usually fails or needs custom replacer.
            // valueToKey used: JSON.stringify(v.value, (_, val) => typeof val === 'bigint' ? val.toString() : val)
            // So we need to handle that.
            // But for simple cases in T125 (literals), we don't use Tagged keys.
            // Just handling I64 and Str is enough for T125.
            // But let's be safe.
            // Reconstructing Value from generic JSON is hard without type info.
            // But Map keys must be immutable/simple?
            // For now, let's implement basic Tagged support or throw.
            throw new Error("Tagged keys not fully supported in keyToValue yet");
        }

        // Fallback or legacy check?
        // Maybe it's a legacy key?
        // if (k.endsWith('n')) return { kind: 'I64', value: BigInt(k.slice(0, -1)) };
        // if (k === 'true') return { kind: 'Bool', value: true };
        // if (k === 'false') return { kind: 'Bool', value: false };
        // if (k.startsWith('"')) return { kind: 'Str', value: JSON.parse(k) };

        throw new Error(`Runtime: Invalid map key string: ${k} `);
    }

    private pid: number;
    private interpreterCache: Map<string, Interpreter> = new Map();
    private depthCounter = 0;
    private static globalStepCounter = 0;

    constructor(program: Program, fs: Record<string, string> | IFileSystem = {}, private resolver?: ModuleResolver, net?: INetwork, cache?: Map<string, Interpreter>) {
        this.program = program;
        if (cache) this.interpreterCache = cache;
        this.interpreterCache.set(this.program.module.name, this);
        // Backwards compatibility with tests passing Record
        if (typeof (fs as any).readFile === 'function') {
            this.fs = fs as IFileSystem;
        } else {
            this.fs = new MockFileSystem(fs as Record<string, string>);
        }
        this.net = net || new MockNetwork();

        this.pid = ProcessManager.instance.getNextPid();
        ProcessManager.instance.register(this.pid);

        for (const def of program.defs) {
            if (def.kind === 'DefFn') {
                this.functions.set(def.name, def);
            }
        }
    }

    async evalMain(): Promise<Value> {
        // initialize constants
        await this.initConstants();

        const main = this.functions.get('main');
        if (!main) throw new Error("No main function defined");

        return this.evalExpr(main.body, undefined);
    }

    // Public method to call a specific function with values
    public async callFunction(name: string, args: Value[]): Promise<Value> {
        await this.initConstants();
        const func = this.functions.get(name);
        if (!func) throw new Error(`Unknown function: $ { name } `);
        if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name} `);

        let env: LinkedEnv | undefined = undefined;
        for (let i = 0; i < args.length; i++) {
            env = { name: func.args[i].name, value: args[i], parent: env };
        }
        return this.evalExpr(func.body, env);
    }

    public callFunctionSync(name: string, args: Value[]): Value {
        this.initConstantsSync();
        const func = this.functions.get(name);
        if (!func) throw new Error(`Unknown function: ${name}`);
        if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);

        let env: LinkedEnv | undefined = undefined;
        for (let i = 0; i < args.length; i++) {
            env = { name: func.args[i].name, value: args[i], parent: env };
        }
        console.log(`[Interpreter CALL] ${this.program.module.name}.${name}`);
        this.depthCounter = 0;
        return this.evalExprSync(func.body, env);
    }

    private async initConstants() {
        if (this.constants.size > 0) return;
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, await this.evalExpr(def.value, undefined));
            }
        }
    }

    private initConstantsSync() {
        if (this.constants.size > 0) return;
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, this.evalExprSync(def.value, undefined));
            }
        }
    }

    private resolveEnv(name: string, env?: LinkedEnv): Value | undefined {
        let current = env;
        while (current) {
            if (current.name === name) {
                return current.value;
            }
            current = current.parent;
        }
        return undefined;
    }

    private async evalExpr(expr: Expr, env?: LinkedEnv): Promise<Value> {
        switch (expr.kind) {
            case 'Literal':
                return expr.value;

            case 'Var': {
                const v = this.resolveEnv(expr.name, env);
                if (v !== undefined) return v;
                const c = this.constants.get(expr.name);
                if (c !== undefined) return c;

                if (expr.name.includes('.')) {
                    const parts = expr.name.split('.');
                    let currentVal = this.resolveEnv(parts[0], env) || this.constants.get(parts[0]);
                    if (currentVal) {
                        for (let i = 1; i < parts.length; i++) {
                            const part = parts[i];
                            if (currentVal!.kind === 'Record') {
                                const fieldVal: Value = (currentVal as any).fields[part];
                                if (!fieldVal) throw new Error(`Runtime: Unknown field ${part} `);
                                currentVal = fieldVal;
                            } else if (currentVal!.kind === 'Tuple') {
                                const index = parseInt(part);
                                if (isNaN(index)) throw new Error(`Runtime: Tuple index must be number, got ${part} `);
                                if (index < 0 || index >= (currentVal as any).items.length) throw new Error(`Runtime: Tuple index out of bounds ${index} `);
                                currentVal = (currentVal as any).items[index];
                            } else {
                                throw new Error(`Runtime: Cannot access field ${part} of ${currentVal!.kind} `);
                            }
                        }
                        return currentVal!;
                    }
                }

                throw new Error(`Runtime Unknown variable: ${expr.name} `);
            }

            case 'Let': {
                const val = await this.evalExpr(expr.value, env);
                const newEnv: LinkedEnv = { name: expr.name, value: val, parent: env };
                return this.evalExpr(expr.body, newEnv);
            }

            case 'If': {
                const cond = await this.evalExpr(expr.cond, env);
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
                                func = targetDef;
                            }
                        }
                    }
                }


                // Evaluate args in current scope
                const args: Value[] = [];
                for (const arg of expr.args) {
                    args.push(await this.evalExpr(arg, env));
                }

                if (expr.fn.includes('.')) {
                    // It's a cross-module call.
                    const [alias, fname] = expr.fn.split('.');
                    const importDecl = this.program.imports.find(i => i.alias === alias);
                    if (importDecl && this.resolver) {
                        const importedPath = importDecl.path;
                        let subInterp = this.interpreterCache.get(importedPath);
                        if (!subInterp) {
                            const importedProg = this.resolver(importedPath);
                            if (importedProg) {
                                subInterp = new Interpreter(importedProg, this.fs, this.resolver, this.net, this.interpreterCache);
                            }
                        }
                        if (subInterp) {
                            const res = await subInterp.callFunction(fname, args);

                            // Diagnostic logging
                            if (expr.fn === 'lexer.tokenize' && res.kind === 'List') {
                                console.log(`[Diagnostic] lexer.tokenize returned ${res.items.length} tokens`);
                            } else if (expr.fn === 'parser.parse' && res.kind === 'Record') {
                                const defs = res.fields['defs'];
                                if (defs && defs.kind === 'List') {
                                    console.log(`[Diagnostic] parser.parse returned ${defs.items.length} definitions`);
                                }
                            }

                            return res;
                        }
                    }
                }

                if (!func) {
                    try {
                        return await this.evalIntrinsic(expr.fn as any, args);
                    } catch (e) {
                        throw new Error(`Unknown function: $ { expr.fn } `);
                    }
                }

                if (args.length !== func.args.length) throw new Error(`Arity mismatch for ${expr.fn}`);

                // Create new env for function body
                let newEnv: LinkedEnv | undefined = undefined;
                for (let i = 0; i < args.length; i++) {
                    newEnv = { name: func.args[i].name, value: args[i], parent: newEnv };
                }

                return this.evalExpr(func.body, newEnv);
            }

            case 'Match': {
                const target = await this.evalExpr(expr.target, env);

                // Find matching case
                for (const c of expr.cases) {
                    // Check tag match
                    let match = false;
                    let newEnv = env;

                    if (target.kind === 'Option') {
                        if (c.tag === 'None' && target.value === null) match = true;
                        else if (c.tag === 'Some' && target.value !== null) {
                            match = true;
                            if (c.vars.length > 0) newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                        }
                    } else if (target.kind === 'Result') {
                        if (c.tag === 'Ok' && target.isOk) {
                            match = true;
                            if (c.vars.length > 0) newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                        } else if (c.tag === 'Err' && !target.isOk) {
                            match = true;
                            if (c.vars.length > 0) newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                        }
                    } else if (target.kind === 'List') {
                        if (c.tag === 'nil' && target.items.length === 0) {
                            match = true;
                        } else if (c.tag === 'cons' && target.items.length > 0) {
                            match = true;
                            if (c.vars.length >= 1) newEnv = { name: c.vars[0], value: target.items[0], parent: newEnv };
                            if (c.vars.length >= 2) {
                                newEnv = { name: c.vars[1], value: { kind: 'List', items: target.items.slice(1) }, parent: newEnv };
                            }
                        }
                    } else if (target.kind === 'Tagged') {
                        if (c.tag === target.tag) {
                            match = true;
                            if (c.vars.length > 0 && target.value) {
                                if (target.value.kind === 'Tuple') {
                                    for (let i = 0; i < c.vars.length && i < target.value.items.length; i++) {
                                        newEnv = { name: c.vars[i], value: target.value.items[i], parent: newEnv };
                                    }
                                } else {
                                    newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                                }
                            }
                        }
                    } else if (target.kind === 'Tuple' && target.items.length > 0 && target.items[0].kind === 'Str') {
                        // Generic Tagged Union (represented as Tuple ["Tag", ...args])
                        const tagName = target.items[0].value;
                        if (c.tag === tagName) {
                            match = true;
                            // Bind variables to remaining tuple items
                            for (let i = 0; i < c.vars.length; i++) {
                                if (i + 1 < target.items.length) {
                                    newEnv = { name: c.vars[i], value: target.items[i + 1], parent: newEnv };
                                }
                            }
                        }
                    }

                    if (match || c.tag === '_') {
                        return this.evalExpr(c.body, newEnv);
                    }
                }
                const replacer = (_: string, v: any) => typeof v === 'bigint' ? v.toString() + 'n' : v;
                throw new Error(`No matching case for value ${JSON.stringify(target, replacer)}`);
            }

            case 'Record': {
                const fields: Record<string, Value> = {};
                for (const [key, valExpr] of Object.entries(expr.fields)) {
                    fields[key] = await this.evalExpr(valExpr, env);
                }
                return { kind: 'Record', fields };
            }

            case 'Tagged': {
                const val = await this.evalExpr(expr.value, env);
                return { kind: 'Tagged', tag: expr.tag, value: val };
            }

            case 'Tuple': {
                const items: Value[] = [];
                for (const item of expr.items) {
                    items.push(await this.evalExpr(item, env));
                }
                return { kind: 'Tuple', items };
            }

            case 'List': {
                const items: Value[] = [];
                for (const item of expr.items) {
                    items.push(await this.evalExpr(item, env));
                }
                return { kind: 'List', items };
            }

            case 'Intrinsic': {
                const args: Value[] = [];
                for (const arg of expr.args) {
                    args.push(await this.evalExpr(arg, env));
                }
                return this.evalIntrinsic(expr.op, args);
            }

            default:
                throw new Error(`Unimplemented eval for ${(expr as any).kind}`);
        }
    }

    private async evalIntrinsic(op: IntrinsicOp, args: Value[]): Promise<Value> {
        if (op === '=') {
            const v1 = args[0] as any;
            const v2 = args[1] as any;

            const r1 = typeof v1 === 'bigint' ? { kind: 'I64', value: v1 } : (typeof v1 === 'string' ? { kind: 'Str', value: v1 } : v1);
            const r2 = typeof v2 === 'bigint' ? { kind: 'I64', value: v2 } : (typeof v2 === 'string' ? { kind: 'Str', value: v2 } : v2);

            if (r1.kind === 'I64' && r2.kind === 'I64') return { kind: 'Bool', value: r1.value === r2.value };
            if (r1.kind === 'Str' && r2.kind === 'Str') return { kind: 'Bool', value: r1.value === r2.value };
            if (r1.kind === 'Bool' && r2.kind === 'Bool') return { kind: 'Bool', value: r1.value === r2.value };
            return { kind: 'Bool', value: false };
        }

        if (['+', '-', '*', '/', '%', '<=', '<', '>=', '>'].includes(op)) {
            let v1 = args[0] as any;
            let v2 = args[1] as any;

            const a = typeof v1 === 'bigint' ? v1 : (v1.kind === 'I64' ? v1.value : null);
            const b = typeof v2 === 'bigint' ? v2 : (v2.kind === 'I64' ? v2.value : null);

            if (a === null || b === null) throw new Error(`Math expects I64 for ${op}, got ${typeof v1 === 'bigint' ? 'bigint' : v1.kind} and ${typeof v2 === 'bigint' ? 'bigint' : v2.kind} `);

            const na = a as bigint;
            const nb = b as bigint;

            switch (op) {
                case '+': return { kind: 'I64', value: na + nb };
                case '-': return { kind: 'I64', value: na - nb };
                case '*': return { kind: 'I64', value: na * nb };
                case '%': {
                    if (nb === 0n) throw new Error("Modulo by zero");
                    return { kind: 'I64', value: na % nb };
                }
                case '/': {
                    if (nb === 0n) throw new Error("Division by zero");
                    return { kind: 'I64', value: na / nb };
                }
                case '<=': return { kind: 'Bool', value: na <= nb };
                case '<': return { kind: 'Bool', value: na < nb };
                case '>=': return { kind: 'Bool', value: na >= nb };
                case '>': return { kind: 'Bool', value: na > nb };
            }
        }

        if (op === '&&') {
            const v1 = args[0]; const v2 = args[1];
            if (v1.kind !== 'Bool' || v2.kind !== 'Bool') throw new Error("&& expects Bool");
            return { kind: 'Bool', value: v1.value && v2.value };
        }
        if (op === '||') {
            const v1 = args[0]; const v2 = args[1];
            if (v1.kind !== 'Bool' || v2.kind !== 'Bool') throw new Error("|| expects Bool");
            return { kind: 'Bool', value: v1.value || v2.value };
        }
        if (op === '!') {
            const v1 = args[0];
            if (v1.kind !== 'Bool') throw new Error("! expects Bool");
            return { kind: 'Bool', value: !v1.value };
        }

        // Concurrency Intrinsics
        if (op === 'sys.self') {
            return { kind: 'I64', value: BigInt(this.pid) };
        }

        if (op === 'sys.spawn') {
            const fnName = args[0];
            if (fnName.kind !== 'Str') throw new Error("sys.spawn expects function name (Str)");

            // Create detached interpreter
            const child = new Interpreter(this.program, this.fs, this.resolver, this.net);
            const childPid = child.pid;

            // Fire and forget (detached)
            Promise.resolve().then(async () => {
                try {
                    await child.callFunction(fnName.value, []);
                } catch (e) {
                    console.error(`Process ${childPid} crashed: `, e);
                }
            });

            return { kind: 'I64', value: BigInt(childPid) };
        }

        if (op === 'sys.send') {
            const pid = args[0];
            const msg = args[1];
            if (pid.kind !== 'I64') throw new Error("sys.send expects PID (I64)");
            if (msg.kind !== 'Str') throw new Error("sys.send expects Msg (Str)");

            const sent = ProcessManager.instance.send(Number(pid.value), msg.value);
            return { kind: 'Bool', value: sent };
        }

        if (op === 'sys.recv') {
            const msg = await ProcessManager.instance.recv(this.pid);
            return { kind: 'Str', value: msg };
        }

        if (op === 'sys.sleep') {
            const ms = args[0];
            if (ms.kind !== 'I64') throw new Error("sys.sleep expects I64 ms");
            await new Promise(resolve => setTimeout(resolve, Number(ms.value)));
            return { kind: 'Bool', value: true };
        }

        if (op === 'Some') {
            return { kind: 'Option', value: args[0] };
        }

        if (op === 'Ok') return { kind: 'Result', isOk: true, value: args[0] };
        if (op === 'Err') return { kind: 'Result', isOk: false, value: args[0] };

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

        if (op === 'io.read_dir') {
            const path = args[0];
            if (path.kind !== 'Str') throw new Error("path must be string");
            if (!this.fs.readDir) return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Not supported" } };

            const entries = this.fs.readDir(path.value);
            if (entries === null) return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Directory not found or error" } };

            const listVal: Value = {
                kind: 'List',
                items: entries.map(s => ({ kind: 'Str', value: s }))
            };
            return { kind: 'Result', isOk: true, value: listVal };
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
            return { kind: 'I64', value: 0n };
        }

        if (op === 'i64.from_string') {
            const val = args[0];
            if (val.kind !== 'Str') throw new Error("i64.from_string expects Str");
            if (val.value === "") throw new Error("i64.from_string: empty string");
            return { kind: 'I64', value: BigInt(val.value) };
        }

        if (op === 'i64.to_string') {
            const val = args[0] as any;
            if (typeof val === 'bigint') return { kind: 'Str', value: val.toString() };
            if (val.kind !== 'I64') throw new Error("i64.to_string expects I64");
            return { kind: 'Str', value: val.value.toString() };
        }

        if (op.startsWith('net.')) {
            if (op === 'net.listen') {
                const port = args[0];
                if (port.kind !== 'I64') throw new Error("net.listen expects I64 port");
                const h = await this.net.listen(Number(port.value));
                if (h !== null) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(h) } };
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Listen failed" } };
            }
            if (op === 'net.accept') {
                const serverSock = args[0];
                if (serverSock.kind !== 'I64') throw new Error("net.accept expects I64");
                const h = await this.net.accept(Number(serverSock.value));
                if (h !== null) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(h) } };
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Accept failed" } };
            }
            if (op === 'net.read') {
                const sock = args[0];
                if (sock.kind !== 'I64') throw new Error("net.read expects I64");
                const s = await this.net.read(Number(sock.value));
                if (s !== null) return { kind: 'Result', isOk: true, value: { kind: 'Str', value: s } };
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Read failed" } };
            }
            if (op === 'net.write') {
                const sock = args[0];
                const str = args[1];
                if (sock.kind !== 'I64') throw new Error("net.write expects I64");
                if (str.kind !== 'Str') throw new Error("net.write expects Str");
                const s = await this.net.write(Number(sock.value), str.value);
                if (s) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(s ? 1 : 0) } };
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Write failed" } };
            }
            if (op === 'net.close') {
                const sock = args[0];
                if (sock.kind !== 'I64') throw new Error("net.close expects I64");
                const s = await this.net.close(Number(sock.value));
                if (s) return { kind: 'Result', isOk: true, value: { kind: 'Bool', value: true } };
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Close failed" } };
            }
            if (op === 'net.connect') {
                const host = args[0];
                const port = args[1];
                if (host.kind !== 'Str') throw new Error("net.connect expects Str host");
                if (port.kind !== 'I64') throw new Error("net.connect expects I64 port");
                const h = await this.net.connect(host.value, Number(port.value));
                if (h !== null) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(h) } };
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Connect failed" } };
            }
        }



        if (op === 'http.parse_request') {
            const raw = args[0];
            if (raw.kind !== 'Str') throw new Error("http.parse_request expects Str");
            const text = raw.value;

            try {
                const parts = text.split(/\r?\n\r?\n/); // Split head and body
                const head = parts[0];
                const body = parts.slice(1).join('\n\n');

                const lines = head.split(/\r?\n/);
                if (lines.length === 0) throw new Error("Empty request");

                const reqLine = lines[0].split(' ');
                if (reqLine.length < 3) throw new Error("Invalid request line");
                const method = reqLine[0];
                const path = reqLine[1];

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

        if (op === 'http.parse_response') {
            const raw = args[0];
            if (raw.kind !== 'Str') throw new Error("http.parse_response expects Str");
            const text = raw.value;

            try {
                const parts = text.split(/\r?\n\r?\n/);
                const head = parts[0];
                const body = parts.slice(1).join('\n\n');

                const lines = head.split(/\r?\n/);
                if (lines.length === 0) throw new Error("Empty response");

                const statusLine = lines[0].split(' ');
                if (statusLine.length < 2) throw new Error("Invalid status line");
                const version = statusLine[0];
                // Handle status code, possibly with text following
                const statusCode = BigInt(parseInt(statusLine[1]));
                // The rest is status text (optional)

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

                const resRecord: Value = {
                    kind: 'Record',
                    fields: {
                        version: { kind: 'Str', value: version },
                        status: { kind: 'I64', value: statusCode },
                        headers: { kind: 'List', items: headers },
                        body: { kind: 'Str', value: body }
                    }
                };

                return { kind: 'Result', isOk: true, value: resRecord };
            } catch (e: any) {
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: e.message } };
            }
        }

        if (op === 'http.get' || op === 'http.post') {
            const url = args[0];
            if (url.kind !== 'Str') throw new Error(`${op} expects Str url`);

            let method = 'GET';
            let bodyStr: string | undefined = undefined;
            const headers: Record<string, string> = {};

            if (op === 'http.post') {
                method = 'POST';
                const bodyArg = args[1];
                if (bodyArg && bodyArg.kind === 'Str') {
                    bodyStr = bodyArg.value;
                }
                // Optional headers arg?
                // For now, simple implementation
            }

            try {
                // Use global fetch (available in Node 18+)
                const resp = await fetch(url.value, {
                    method,
                    body: bodyStr,
                    headers
                });

                const respBody = await resp.text();
                const respHeaders: Value[] = [];
                resp.headers.forEach((val, key) => {
                    respHeaders.push({
                        kind: 'Record',
                        fields: {
                            key: { kind: 'Str', value: key },
                            val: { kind: 'Str', value: val }
                        }
                    });
                });

                const resRecord: Value = {
                    kind: 'Record',
                    fields: {
                        version: { kind: 'Str', value: "HTTP/1.1" }, // fetch doesn't expose version
                        status: { kind: 'I64', value: BigInt(resp.status) },
                        headers: { kind: 'List', items: respHeaders },
                        body: { kind: 'Str', value: respBody }
                    }
                };

                return { kind: 'Result', isOk: true, value: resRecord };

            } catch (e: any) {
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: e.message || "Request Failed" } };
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

        if (op === 'str.len') {
            const s = args[0];
            if (s.kind !== 'Str') throw new Error("str.len expects Str");
            return { kind: 'I64', value: BigInt(s.value.length) };
        }

        if (op === 'str.get') {
            const s = args[0]; const idx = args[1];
            if (s.kind !== 'Str') throw new Error("str.get expects Str");
            if (idx.kind !== 'I64') throw new Error("str.get expects I64 index");
            const i = Number(idx.value);
            if (i >= 0 && i < s.value.length) {
                return { kind: 'Option', value: { kind: 'I64', value: BigInt(s.value.charCodeAt(i)) } };
            }
            return { kind: 'Option', value: null };
        }

        if (op === 'str.substring') {
            const s = args[0]; const start = args[1]; const end = args[2];
            if (s.kind !== 'Str') throw new Error("str.substring expects Str");
            if (start.kind !== 'I64' || end.kind !== 'I64') throw new Error("str.substring expects I64 range");
            const sVal = s.value;
            return { kind: 'Str', value: sVal.substring(Number(start.value), Number(end.value)) };
        }

        if (op === 'str.from_code') {
            const code = args[0];
            if (code.kind !== 'I64') throw new Error("str.from_code expects I64");
            return { kind: 'Str', value: String.fromCharCode(Number(code.value)) };
        }

        if (op === 'str.index_of') {
            const s = args[0]; const sub = args[1];
            if (s.kind !== 'Str' || sub.kind !== 'Str') throw new Error("str.index_of expects Str");
            const idx = s.value.indexOf(sub.value);
            if (idx === -1) return { kind: 'Option', value: null };
            return { kind: 'Option', value: { kind: 'I64', value: BigInt(idx) } };
        }

        if (op.startsWith('map.')) {
            if (op === 'map.make') {
                return { kind: 'Map', value: new Map() };
            }
            if (op === 'map.put') {
                const m = args[0]; const k = args[1]; const v = args[2];
                if (m.kind !== 'Map') throw new Error("map.put expects Map");
                const keyStr = this.valueToKey(k);
                const newMap = new Map(m.value);
                newMap.set(keyStr, v);
                return { kind: 'Map', value: newMap };
            }
            if (op === 'map.get') {
                const m = args[0]; const k = args[1];
                if (m.kind !== 'Map') throw new Error("map.get expects Map");
                const keyStr = this.valueToKey(k);
                const val = m.value.get(keyStr);
                if (val) return { kind: 'Option', value: val };
                return { kind: 'Option', value: null };
            }
            if (op === 'map.contains') {
                const m = args[0]; const k = args[1];
                if (m.kind !== 'Map') throw new Error("map.contains expects Map");
                const keyStr = this.valueToKey(k);
                return { kind: 'Bool', value: m.value.has(keyStr) };
            }
            if (op === 'map.keys') {
                const m = args[0];
                if (m.kind !== 'Map') throw new Error("map.keys expects Map");
                const keys: Value[] = Array.from(m.value.keys()).map(k => this.keyToValue(k));
                return { kind: 'List', items: keys };
            }
        }

        if (op === 'cons') {
            const h = args[0];
            const t = args[1];
            if (t.kind !== 'List') throw new Error("cons arguments must be (head, tail-list)");
            // cons adds to front
            return { kind: 'List', items: [h, ...t.items] };
        }

        if (op.startsWith('list.')) {
            if (op === 'list.length') {
                const l = args[0];
                if (l.kind !== 'List') throw new Error("list.length expects List");
                return { kind: 'I64', value: BigInt(l.items.length) };
            }
            if (op === 'list.get') {
                const l = args[0]; const idx = args[1];
                if (l.kind !== 'List') throw new Error("list.get expects List");
                if (idx.kind !== 'I64') throw new Error("list.get expects I64 index");
                const i = Number(idx.value);
                if (i >= 0 && i < l.items.length) {
                    return { kind: 'Option', value: l.items[i] };
                }
                return { kind: 'Option', value: null };
            }
            if (op === 'list.concat') {
                const l1 = args[0]; const l2 = args[1];
                if (l1.kind !== 'List' || l2.kind !== 'List') throw new Error("list.concat expects two Lists");
                return { kind: 'List', items: [...l1.items, ...l2.items] };
            }
            if (op === 'list.unique') {
                const l = args[0];
                if (l.kind !== 'List') throw new Error("list.unique expects List");
                const seen = new Set<string>();
                const unique: Value[] = [];
                for (const item of l.items) {
                    const key = this.valueToKey(item);
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(item);
                    }
                }
                return { kind: 'List', items: unique };
            }
        }


        if (op === 'record.get') {
            const r = args[0]; const field = args[1];
            if (r.kind !== 'Record') throw new Error("record.get expects Record");
            if (field.kind !== 'Str') throw new Error("record.get expects Str field name");
            const val = r.fields[field.value];
            if (val === undefined) {
                throw new Error(`Record has no field ${field.value} `);
            }
            return val;
        }



        if (op === 'tuple.get') {
            const t = args[0]; const idx = args[1];
            if (t.kind !== 'Tuple') throw new Error("tuple.get expects Tuple");
            if (idx.kind !== 'I64') throw new Error("tuple.get expects I64");
            const i = Number(idx.value);
            if (i < 0 || i >= t.items.length) throw new Error("tuple.get index out of bounds");
            return t.items[i];
        }

        throw new Error(`Unknown intrinsic ${op} `);
    }


    private evalExprSync(expr: Expr, env?: LinkedEnv): Value {
        this.depthCounter++;
        if (expr.kind === 'Call') {
            if (expr.fn === 'parse_def_list' || expr.fn === 'parse_expr' || expr.fn === 'parse_def') {
                // Try to peek at the parser state 'p' in env
                let pVal = this.resolveEnv('p', env);
                if (pVal && pVal.kind === 'Record') {
                    const tokens = pVal.fields['tokens'] as any;
                    if (tokens && tokens.kind === 'List' && tokens.items.length > 0) {
                        const firstToken = tokens.items[0] as any;
                        if (firstToken && firstToken.kind === 'Record') {
                            console.log(`[Parser Trace] [${this.program.module.name}] ${expr.fn} at Token: ${firstToken.fields['kind'].value}:${firstToken.fields['value'].value}`);
                        }
                    }
                }
            }
        }

        if (this.depthCounter % 1000 === 0) {
            let info = expr.kind;
            if (expr.kind === 'Call') {
                info += `:${expr.fn}`;
            }
            console.log(`[Interpreter DEPTH] ${this.depthCounter} | ${info} | ${this.program.module.name}`);
        }

        const result = this._evalExprSync(expr, env);

        if (expr.kind === 'Call' && expr.fn === 'parse_def_list' && result.kind === 'Tuple') {
            const defs = result.items[1];
            if (defs && defs.kind === 'List') {
                console.log(`[Parser Trace] [${this.program.module.name}] parse_def_list RETURNED ${defs.items.length} definitions`);
            }
        }

        this.depthCounter--;
        return result;
    }

    private _evalExprSync(expr: Expr, env?: LinkedEnv): Value {
        let currentExpr = expr;
        let currentEnv = env;

        while (true) {
            Interpreter.globalStepCounter++;
            if (Interpreter.globalStepCounter % 1000000 === 0) {
                console.log(`[Interpreter STEPS] ${Interpreter.globalStepCounter}`);
            }
            switch (currentExpr.kind) {
                case 'Literal':
                    return currentExpr.value;

                case 'Var': {
                    const v = this.resolveEnv(currentExpr.name, currentEnv);
                    if (v !== undefined) return v;
                    const c = this.constants.get(currentExpr.name);
                    if (c !== undefined) return c;

                    if (currentExpr.name.includes('.')) {
                        const parts = currentExpr.name.split('.');
                        let currentVal = this.resolveEnv(parts[0], currentEnv) || this.constants.get(parts[0]);
                        if (currentVal) {
                            for (let i = 1; i < parts.length; i++) {
                                const part = parts[i];
                                if (currentVal!.kind === 'Record') {
                                    const fieldVal: Value = (currentVal as any).fields[part];
                                    if (!fieldVal) throw new Error(`Runtime: Unknown field ${part} `);
                                    currentVal = fieldVal;
                                } else if (currentVal!.kind === 'Tuple') {
                                    const index = parseInt(part);
                                    if (isNaN(index)) throw new Error(`Runtime: Tuple index must be number, got ${part} `);
                                    if (index < 0 || index >= (currentVal as any).items.length) throw new Error(`Runtime: Tuple index out of bounds ${index} `);
                                    currentVal = (currentVal as any).items[index];
                                } else {
                                    throw new Error(`Runtime: Cannot access field ${part} of ${currentVal!.kind} `);
                                }
                            }
                            return currentVal!;
                        }
                    }

                    throw new Error(`Runtime Unknown variable: ${currentExpr.name} `);
                }

                case 'Let': {
                    const val = this.evalExprSync(currentExpr.value, currentEnv);
                    const newEnv: LinkedEnv = { name: currentExpr.name, value: val, parent: currentEnv };
                    // TCO: update expr and env, stay in loop
                    currentExpr = currentExpr.body;
                    currentEnv = newEnv;
                    continue;
                }

                case 'If': {
                    const cond = this.evalExprSync(currentExpr.cond, currentEnv);
                    if (cond.kind !== 'Bool') throw new Error("If condition must be Bool");
                    if (cond.value) {
                        currentExpr = currentExpr.then;
                    } else {
                        currentExpr = currentExpr.else;
                    }
                    // TCO: stay in loop
                    continue;
                }

                case 'Call': {
                    let func = this.functions.get(currentExpr.fn);

                    if (!func && currentExpr.fn.includes('.')) {
                        const [alias, fname] = currentExpr.fn.split('.');
                        const importDecl = this.program.imports.find(i => i.alias === alias);
                        if (importDecl && this.resolver) {
                            const importedProg = this.resolver(importDecl.path);
                            if (importedProg) {
                                const targetDef = importedProg.defs.find(d => d.kind === 'DefFn' && d.name === fname) as any;
                                if (targetDef) {
                                    func = targetDef;
                                }
                            }
                        }
                    }

                    const args: Value[] = [];
                    for (const arg of currentExpr.args) {
                        args.push(this.evalExprSync(arg, currentEnv));
                    }

                    if (currentExpr.fn.includes('.')) {
                        const [alias, fname] = currentExpr.fn.split('.');
                        const importDecl = this.program.imports.find(i => i.alias === alias);
                        if (importDecl && this.resolver) {
                            const importedPath = importDecl.path;
                            let subInterp = this.interpreterCache.get(importedPath);
                            if (!subInterp) {
                                const importedProg = this.resolver(importedPath);
                                if (importedProg) {
                                    subInterp = new Interpreter(importedProg, this.fs, this.resolver, this.net, this.interpreterCache);
                                } else {
                                    console.error(`Resolver failed for module path: ${importedPath}. Imports: ${JSON.stringify(this.program.imports)}`);
                                }
                            }
                            if (subInterp) {
                                const res = subInterp.callFunctionSync(fname, args);
                                if (currentExpr.fn === 'lexer.tokenize' && res.kind === 'List') {
                                    console.log(`[Diagnostic] lexer.tokenize returned ${res.items.length} tokens`);
                                } else if (currentExpr.fn === 'parser.parse' && res.kind === 'Record') {
                                    const defs = res.fields['defs'];
                                    if (defs && defs.kind === 'List') {
                                        console.log(`[Diagnostic] parser.parse returned ${defs.items.length} definitions`);
                                    }
                                }
                                return res;
                            }
                        }
                    }

                    if (!func) {
                        return this.evalIntrinsicSync(currentExpr.fn as any, args);
                    }

                    if (args.length !== func.args.length) throw new Error(`Arity mismatch error call ${currentExpr.fn} expected ${func.args.length} args, got ${args.length} `);

                    let newEnv: LinkedEnv | undefined = undefined;
                    for (let i = 0; i < args.length; i++) {
                        newEnv = { name: func.args[i].name, value: args[i], parent: newEnv };
                    }

                    // TCO: Tail call optimization for Call!
                    currentExpr = func.body;
                    currentEnv = newEnv;
                    continue;
                }

                case 'Match': {
                    const target = this.evalExprSync(currentExpr.target, currentEnv);
                    let foundCase = false;
                    for (const c of currentExpr.cases) {
                        let match = false;
                        let newEnv = currentEnv;

                        if (target.kind === 'Option') {
                            if (c.tag === 'None' && target.value === null) match = true;
                            else if (c.tag === 'Some' && target.value !== null) {
                                match = true;
                                if (c.vars.length > 0) newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                            }
                        } else if (target.kind === 'Result') {
                            if (c.tag === 'Ok' && target.isOk) {
                                match = true;
                                if (c.vars.length > 0) newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                            } else if (c.tag === 'Err' && !target.isOk) {
                                match = true;
                                if (c.vars.length > 0) newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                            }
                        } else if (target.kind === 'Tagged') {
                            if (c.tag === target.tag) {
                                match = true;
                                if (c.vars.length > 0 && target.value) {
                                    if (target.value.kind === 'Tuple') {
                                        for (let i = 0; i < c.vars.length && i < target.value.items.length; i++) {
                                            newEnv = { name: c.vars[i], value: target.value.items[i], parent: newEnv };
                                        }
                                    } else {
                                        newEnv = { name: c.vars[0], value: target.value, parent: newEnv };
                                    }
                                }
                            }
                        } else if (target.kind === 'List') {
                            if (c.tag === 'nil' && target.items.length === 0) {
                                match = true;
                            } else if (c.tag === 'cons' && target.items.length > 0) {
                                match = true;
                                if (c.vars.length >= 1) newEnv = { name: c.vars[0], value: target.items[0], parent: newEnv };
                                if (c.vars.length >= 2) {
                                    newEnv = { name: c.vars[1], value: { kind: 'List', items: target.items.slice(1) }, parent: newEnv };
                                }
                            }
                        } else if (target.kind === 'Tuple' && target.items.length > 0 && target.items[0].kind === 'Str') {
                            // Generic Tagged Union (represented as Tuple ["Tag", ...args])
                            const tagName = target.items[0].value;
                            if (c.tag === tagName) {
                                match = true;
                                // Bind variables to remaining tuple items
                                for (let i = 0; i < c.vars.length; i++) {
                                    if (i + 1 < target.items.length) {
                                        newEnv = { name: c.vars[i], value: target.items[i + 1], parent: newEnv };
                                    }
                                }
                            }
                        }

                        if (match || c.tag === '_') {
                            // TCO: Tail call optimized Match case
                            currentExpr = c.body;
                            currentEnv = newEnv;
                            foundCase = true;
                            break;
                        }
                    }
                    if (foundCase) continue;
                    throw new Error(`Non - exhaustive match for ${JSON.stringify(target)}`);
                }

                case 'Tuple': {
                    const items: Value[] = [];
                    for (const item of currentExpr.items) {
                        items.push(this.evalExprSync(item, currentEnv));
                    }
                    return { kind: 'Tuple', items };
                }

                case 'Record': {
                    const fields: Record<string, Value> = {};
                    for (const [name, valExpr] of Object.entries(currentExpr.fields)) {
                        fields[name] = this.evalExprSync(valExpr, currentEnv);
                    }
                    return { kind: 'Record', fields };
                }

                case 'List': {
                    const items: Value[] = [];
                    for (const item of currentExpr.items) {
                        items.push(this.evalExprSync(item, currentEnv));
                    }
                    return { kind: 'List', items };
                }

                case 'Intrinsic': {
                    const args: Value[] = [];
                    for (const arg of currentExpr.args) {
                        args.push(this.evalExprSync(arg, currentEnv));
                    }
                    return this.evalIntrinsicSync(currentExpr.op, args);
                }

                case 'Tagged': {
                    const val = this.evalExprSync(currentExpr.value, currentEnv);
                    return { kind: 'Tagged', tag: currentExpr.tag, value: val };
                }

                case 'Lambda': {
                    return {
                        kind: 'Lambda',
                        args: currentExpr.args,
                        ret: currentExpr.ret,
                        eff: currentExpr.eff,
                        body: currentExpr.body,
                        env: currentEnv
                    };
                }

                default:
                    throw new Error(`Unimplemented evalSync for ${(currentExpr as any).kind}`);
            }
        }
    }

    private evalIntrinsicSync(op: IntrinsicOp, args: Value[]): Value {
        // Implementation of synchronous intrinsics.
        // Most are synchronous except net.* and sys.sleep.

        if (op === '=') {
            const v1 = args[0] as any;
            const v2 = args[1] as any;

            const normalize = (v: any): any => {
                if (typeof v === 'bigint') return { kind: 'I64', value: v };
                if (typeof v === 'string') return { kind: 'Str', value: v };
                if (typeof v === 'boolean') return { kind: 'Bool', value: v };
                if (v && v.kind === 'Literal') {
                    if (typeof v.value === 'bigint') return { kind: 'I64', value: v.value };
                    if (typeof v.value === 'string') return { kind: 'Str', value: v.value };
                    if (typeof v.value === 'boolean') return { kind: 'Bool', value: v.value };
                }
                return v;
            };

            const r1 = normalize(v1);
            const r2 = normalize(v2);


            if (r1.kind === 'I64' && r2.kind === 'I64') return { kind: 'Bool', value: r1.value === r2.value };
            if (r1.kind === 'Str' && r2.kind === 'Str') return { kind: 'Bool', value: r1.value === r2.value };
            if (r1.kind === 'Bool' && r2.kind === 'Bool') return { kind: 'Bool', value: r1.value === r2.value };
            return { kind: 'Bool', value: false };
        }

        if (['+', '-', '*', '/', '%', '<=', '<', '>=', '>'].includes(op)) {
            let v1 = args[0] as any;
            let v2 = args[1] as any;
            const a = typeof v1 === 'bigint' ? v1 : (v1.kind === 'I64' ? v1.value : null);
            const b = typeof v2 === 'bigint' ? v2 : (v2.kind === 'I64' ? v2.value : null);
            if (a === null || b === null) throw new Error(`Math expects I64 for ${op}`);
            const na = a as bigint; const nb = b as bigint;
            switch (op) {
                case '+': return { kind: 'I64', value: na + nb };
                case '-': return { kind: 'I64', value: na - nb };
                case '*': return { kind: 'I64', value: na * nb };
                case '/': if (nb === 0n) throw new Error("Division by zero"); return { kind: 'I64', value: na / nb };
                case '%': if (nb === 0n) throw new Error("Modulo by zero"); return { kind: 'I64', value: na % nb };
                case '<=': return { kind: 'Bool', value: na <= nb };
                case '<': return { kind: 'Bool', value: na < nb };
                case '>=': return { kind: 'Bool', value: na >= nb };
                case '>': return { kind: 'Bool', value: na > nb };
            }
        }

        if (op === '&&' || op === '||' || op === '&' || op === '|') {
            const v1 = args[0]; const v2 = args[1];
            if (v1.kind !== 'Bool' || v2.kind !== 'Bool') throw new Error(`${op} expects Bools`);
            if (op === '&&' || op === '&') return { kind: 'Bool', value: v1.value && v2.value };
            return { kind: 'Bool', value: v1.value || v2.value };
        }

        if (op === 'Not' || op === '!') {
            if (args[0].kind !== 'Bool') throw new Error("Not expects Bool");
            return { kind: 'Bool', value: !args[0].value };
        }

        if (op === 'Some') return { kind: 'Option', value: args[0] };
        if (op === 'Ok') return { kind: 'Result', isOk: true, value: args[0] };
        if (op === 'Err') return { kind: 'Result', isOk: false, value: args[0] };

        if (op === 'io.read_file') {
            const path = args[0];
            if (path.kind !== 'Str') throw new Error("path must be string");
            const content = this.fs.readFile(path.value);
            if (content !== null) return { kind: 'Result', isOk: true, value: { kind: 'Str', value: content } };
            return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "ENOENT" } };
        }

        if (op === 'io.write_file') {
            const path = args[0]; const content = args[1];
            if (path.kind !== 'Str' || content.kind !== 'Str') throw new Error("io.write_file expects strings");
            this.fs.writeFile(path.value, content.value);
            return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(content.value.length) } };
        }

        if (op === 'io.file_exists') {
            return { kind: 'Bool', value: this.fs.exists((args[0] as any).value) };
        }

        if (op === 'io.print') {
            const val = args[0];
            if (val.kind === 'Str') console.log(val.value);
            else if (val.kind === 'I64' || val.kind === 'Bool') console.log(val.value.toString());
            else console.log(JSON.stringify(val));
            return { kind: 'I64', value: 0n };
        }

        if (op === 'str.concat') return { kind: 'Str', value: ((args[0] as any)?.value || "") + ((args[1] as any)?.value || "") };
        if (op === 'str.len') return { kind: 'I64', value: BigInt(((args[0] as any)?.value || "").length) };
        if (op === 'str.get') {
            const s = (args[0] as any).value; const i = Number((args[1] as any).value);
            if (i >= 0 && i < s.length) return { kind: 'Option', value: { kind: 'I64', value: BigInt(s.charCodeAt(i)) } };
            return { kind: 'Option', value: null };
        }
        if (op === 'str.substring') return { kind: 'Str', value: (args[0] as any).value.substring(Number((args[1] as any).value), Number((args[2] as any).value)) };
        if (op === 'str.from_code') return { kind: 'Str', value: String.fromCharCode(Number((args[0] as any).value)) };
        if (op === 'str.index_of') {
            const s = (args[0] as any).value; const sub = (args[1] as any).value;
            const idx = s.indexOf(sub);
            if (idx === -1) return { kind: 'Option', value: null };
            return { kind: 'Option', value: { kind: 'I64', value: BigInt(idx) } };
        }
        if (op === 'str.contains') return { kind: 'Bool', value: (args[0] as any).value.includes((args[1] as any).value) };
        if (op === 'str.ends_with') return { kind: 'Bool', value: (args[0] as any).value.endsWith((args[1] as any).value) };

        if (op === 'cons') return { kind: 'List', items: [args[0], ... (args[1] as any).items] };
        if (op === 'list.length') return { kind: 'I64', value: BigInt((args[0] as any).items.length) };
        if (op === 'list.get') {
            const l = (args[0] as any).items; const i = Number((args[1] as any).value);
            if (i >= 0 && i < l.length) return { kind: 'Option', value: l[i] };
            return { kind: 'Option', value: null };
        }
        if (op === 'list.concat') return { kind: 'List', items: [...(args[0] as any).items, ...(args[1] as any).items] };
        if (op === 'list.unique') {
            const l = args[0] as any;
            const seen = new Set<string>();
            const items: Value[] = [];
            for (const item of l.items) {
                const k = this.valueToKey(item);
                if (!seen.has(k)) {
                    seen.add(k);
                    items.push(item);
                }
            }
            return { kind: 'List', items };
        }

        if (op.startsWith('map.')) {
            if (op === 'map.make') return { kind: 'Map', value: new Map() };
            if (op === 'map.put') {
                const m = args[0] as any; const k = args[1]; const v = args[2];
                const newMap = new Map<string, Value>(m.value);
                newMap.set(this.valueToKey(k), v);
                return { kind: 'Map', value: newMap };
            }
            if (op === 'map.get') {
                const m = args[0] as any; const k = args[1];
                const v = m.value.get(this.valueToKey(k));
                return v ? { kind: 'Option', value: v } : { kind: 'Option', value: null };
            }
            if (op === 'map.contains') return { kind: 'Bool', value: (args[0] as any).value.has(this.valueToKey(args[1])) };
            if (op === 'map.keys') {
                const m = args[0] as any;
                const keys = Array.from((m.value as Map<string, Value>).keys()).map((k: string) => this.keyToValue(k));
                return { kind: 'List', items: keys };
            }
        }

        if (op === 'record.get') {
            const r = args[0]; const f = args[1];
            if (r.kind !== 'Record' || f.kind !== 'Str') throw new Error("record.get expects Record and Str");
            const val = r.fields[f.value];
            if (val === undefined) throw new Error(`Field ${f.value} not found`);
            return val;
        }

        if (op === 'tuple.get') {
            const t = args[0]; const i = args[1];
            if (t.kind !== 'Tuple' || i.kind !== 'I64') throw new Error("tuple.get expects Tuple and I64");
            const idx = Number(i.value);
            if (idx < 0 || idx >= t.items.length) throw new Error("Tuple index out of bounds");
            return t.items[idx];
        }

        if (op.startsWith('net.') || op === 'sys.sleep') {
            throw new Error(`Cannot call async intrinsic ${op} from synchronous evaluation path`);
        }

        if (op === 'i64.to_string') return { kind: 'Str', value: (args[0] as any).value.toString() };
        if (op === 'i64.from_string') return { kind: 'I64', value: BigInt((args[0] as any).value) };

        throw new Error(`Unknown intrinsic or not implemented in Sync path: ${op} `);
    }
}
