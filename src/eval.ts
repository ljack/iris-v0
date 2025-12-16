import { Program, Definition, Expr, Value, IntrinsicOp, MatchCase, ModuleResolver } from './types';


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
}

export class Interpreter {
    private program: Program;
    private functions = new Map<string, Definition & { kind: 'DefFn' }>();
    private constants = new Map<string, Value>();
    private fs: IFileSystem;
    private net: INetwork;

    constructor(program: Program, fs: Record<string, string> | IFileSystem = {}, private resolver?: ModuleResolver, net?: INetwork) {
        this.program = program;
        // Backwards compatibility with tests passing Record
        if (typeof (fs as any).readFile === 'function') {
            this.fs = fs as IFileSystem;
        } else {
            this.fs = new MockFileSystem(fs as Record<string, string>);
        }
        this.net = net || new MockNetwork();

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

        return this.evalExpr(main.body, new Map());
    }

    // Public method to call a specific function with values
    async callFunction(name: string, args: Value[]): Promise<Value> {
        await this.initConstants();

        const func = this.functions.get(name);
        if (!func) throw new Error(`Unknown function: ${name}`);
        if (args.length !== func.args.length) throw new Error(`Arity mismatch call ${name}`);

        const newEnv = new Map<string, Value>();
        for (let i = 0; i < args.length; i++) {
            newEnv.set(func.args[i].name, args[i]);
        }
        return this.evalExpr(func.body, newEnv);
    }

    private async initConstants() {
        if (this.constants.size > 0) return;
        for (const def of this.program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, await this.evalExpr(def.value, new Map()));
            }
        }
    }

    private async evalExpr(expr: Expr, env: Map<string, Value>): Promise<Value> {
        switch (expr.kind) {
            case 'Literal':
                return expr.value;

            case 'Var': {
                const v = env.get(expr.name);
                if (v !== undefined) return v;
                const c = this.constants.get(expr.name);
                if (c !== undefined) return c;

                if (expr.name.includes('.')) {
                    const parts = expr.name.split('.');
                    let currentVal = env.get(parts[0]) || this.constants.get(parts[0]);
                    if (currentVal) {
                        for (let i = 1; i < parts.length; i++) {
                            if (currentVal!.kind !== 'Record') throw new Error(`Runtime: Cannot access field ${parts[i]} of non-record`);
                            const fieldVal: Value = (currentVal as any).fields[parts[i]];
                            if (!fieldVal) throw new Error(`Runtime: Unknown field ${parts[i]}`);
                            currentVal = fieldVal;
                        }
                        return currentVal!;
                    }
                }

                throw new Error(`Runtime Unknown variable: ${expr.name}`);
            }

            case 'Let': {
                const val = await this.evalExpr(expr.value, env);
                const newEnv = new Map(env);
                newEnv.set(expr.name, val);
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

                if (!func) throw new Error(`Unknown function: ${expr.fn}`);

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
                        const importedProg = this.resolver(importDecl.path)!;
                        // New interpreter instance for the other module
                        const subInterp = new Interpreter(importedProg, this.fs, this.resolver, this.net);
                        return subInterp.callFunction(fname, args);
                    }
                }

                if (args.length !== func.args.length) throw new Error(`Arity mismatch for ${expr.fn}`);

                // Create new env for function body
                const newEnv = new Map<string, Value>();
                for (let i = 0; i < args.length; i++) {
                    newEnv.set(func.args[i].name, args[i]);
                }

                return this.evalExpr(func.body, newEnv);
            }

            case 'Match': {
                const target = await this.evalExpr(expr.target, env);

                // Find matching case
                for (const c of expr.cases) {
                    // Check tag match
                    let match = false;
                    let newBindings = new Map(env);

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
                    } else if (target.kind === 'List') {
                        if (c.tag === 'nil' && target.items.length === 0) {
                            match = true;
                        } else if (c.tag === 'cons' && target.items.length > 0) {
                            match = true;
                            if (c.vars.length >= 1) newBindings.set(c.vars[0], target.items[0]);
                            if (c.vars.length >= 2) {
                                newBindings.set(c.vars[1], { kind: 'List', items: target.items.slice(1) });
                            }
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
                    fields[key] = await this.evalExpr(valExpr, env);
                }
                return { kind: 'Record', fields };
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
