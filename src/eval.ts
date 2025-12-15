import { Program, Definition, Expr, Value, IntrinsicOp, MatchCase } from './types';

export class Interpreter {
    private program: Program;
    private functions = new Map<string, Definition & { kind: 'DefFn' }>();
    private constants = new Map<string, Value>();
    private fs: Record<string, string>;

    constructor(program: Program, fs: Record<string, string> = {}) {
        this.program = program;
        this.fs = fs;

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
                const fn = this.functions.get(expr.fn);
                if (!fn) throw new Error(`Function not found: ${expr.fn}`);

                const argVals = expr.args.map(a => this.evalExpr(a, env));
                const newEnv = new Map<string, Value>();
                for (let i = 0; i < fn.args.length; i++) {
                    newEnv.set(fn.args[i].name, argVals[i]);
                }
                return this.evalExpr(fn.body, newEnv);
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
        if (op === 'None') { // Wait, None is a Literal in typical usage, but here acts as intrinsic? 
            // Actually my parser parses 'None' as literal 'Option'.
            // If it appears as (None), it's a call/intrinsic. Spec says "None" is a constructor.
            // My parser handles bare 'None' as Literal. 
            // If code says (None), parser sees Intrinsic 'None' with 0 args.
            return { kind: 'Option', value: null };
        }

        if (op === 'Ok') return { kind: 'Result', isOk: true, value: args[0] };
        if (op === 'Err') return { kind: 'Result', isOk: false, value: args[0] }; // Value is the error string or obj

        if (op === 'io.read_file') {
            const path = args[0];
            if (path.kind !== 'Str') throw new Error("path must be string");
            if (Object.prototype.hasOwnProperty.call(this.fs, path.value)) {
                return { kind: 'Result', isOk: true, value: { kind: 'Str', value: this.fs[path.value] } };
            } else {
                return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "ENOENT" } };
            }
        }

        if (op === 'io.print') {
            // Mock print
            console.log("IO.PRINT:", args[0]);
            return { kind: 'Bool', value: true }; // Unit? v0 doesn't have Unit, maybe Bool or I64
        }

        throw new Error(`Unknown intrinsic ${op}`);
    }
}
