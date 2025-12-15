import { Program, Definition, Expr, IrisType, IrisEffect, IntrinsicOp, ModuleResolver } from './types';

export class TypeChecker {
    private functions = new Map<string, { args: IrisType[], ret: IrisType, eff: IrisEffect }>();
    private constants = new Map<string, IrisType>();
    private currentProgram?: Program;

    constructor(private resolver?: ModuleResolver) { }

    check(program: Program) {
        this.currentProgram = program;
        // First pass: collect signatures
        for (const def of program.defs) {
            if (def.kind === 'DefConst') {
                this.constants.set(def.name, def.type);
            } else if (def.kind === 'DefFn') {
                const argNames = new Set<string>();
                for (const a of def.args) {
                    if (argNames.has(a.name)) throw new Error(`TypeError: Duplicate argument name: ${a.name}`);
                    argNames.add(a.name);
                }
                this.functions.set(def.name, {
                    args: def.args.map(a => a.type),
                    ret: def.ret,
                    eff: def.eff
                });
            }
        }

        // Second pass: check bodies
        for (const def of program.defs) {
            if (def.kind === 'DefConst') {
                const { type, eff } = this.checkExprFull(def.value, new Map());
                this.expectType(def.type, type, `Constant ${def.name} type mismatch`);
                this.checkEffectSubtype(eff, '!Pure', `Constant ${def.name} must be Pure`);
            } else if (def.kind === 'DefFn') {
                const fnType = this.functions.get(def.name)!;
                const env = new Map<string, IrisType>();
                for (let i = 0; i < def.args.length; i++) {
                    env.set(def.args[i].name, def.args[i].type);
                }

                const { type: bodyType, eff: bodyEff } = this.checkExprFull(def.body, env);

                this.expectType(def.ret, bodyType, `Function ${def.name} return type mismatch`);

                if (def.eff === '!Infer') {
                    // Update registry with inferred effect logic if we supported two-pass inference or similar.
                    // For now, allow it to pass.
                    // In a real system we'd update this.functions but since we already visited calls,
                    // we might need a fixpoint. For v0.2 simple scope, we just let it accept.
                    this.functions.set(def.name, { ...fnType, eff: bodyEff });
                } else {
                    this.checkEffectSubtype(bodyEff, def.eff, `Function ${def.name}`);
                }
            }
        }
    }

    // Returns Type AND Inferred Effect
    private checkExprFull(expr: Expr, env: Map<string, IrisType>): { type: IrisType, eff: IrisEffect } {
        switch (expr.kind) {
            case 'Literal': {
                const val = expr.value;
                if (val.kind === 'I64') return { type: { type: 'I64' }, eff: '!Pure' };
                if (val.kind === 'Bool') return { type: { type: 'Bool' }, eff: '!Pure' };
                if (val.kind === 'Str') return { type: { type: 'Str' }, eff: '!Pure' };
                if (val.kind === 'Option') {
                    if (val.value === null) return { type: { type: 'Option', inner: { type: 'I64' } }, eff: '!Pure' }; // Default None type
                    const inner = this.checkExprFull({ kind: 'Literal', value: val.value } as Expr, env);
                    return { type: { type: 'Option', inner: inner.type }, eff: inner.eff };
                }
                if (val.kind === 'Result') {
                    const v = this.checkExprFull({ kind: 'Literal', value: val.value } as Expr, env);
                    // Generous Result type
                    return { type: { type: 'Result', ok: val.isOk ? v.type : { type: 'Str' }, err: val.isOk ? { type: 'Str' } : v.type }, eff: v.eff };
                }
                if (val.kind === 'List') return { type: { type: 'List', inner: { type: 'I64' } }, eff: '!Pure' };
                if (val.kind === 'Tuple') return { type: { type: 'Tuple', items: [] }, eff: '!Pure' };
                if (val.kind === 'Record') return { type: { type: 'Record', fields: {} }, eff: '!Pure' };
                throw new Error(`Unknown literal kind: ${(val as any).kind}`);
            }

            case 'Var': {
                if (env.has(expr.name)) return { type: env.get(expr.name)!, eff: '!Pure' };
                if (this.constants.has(expr.name)) return { type: this.constants.get(expr.name)!, eff: '!Pure' };
                throw new Error(`TypeError: Unknown variable: ${expr.name}`);
            }

            case 'Let': {
                const val = this.checkExprFull(expr.value, env);
                const newEnv = new Map(env).set(expr.name, val.type);
                const body = this.checkExprFull(expr.body, newEnv);
                return { type: body.type, eff: this.joinEffects(val.eff, body.eff) };
            }

            case 'If': {
                const cond = this.checkExprFull(expr.cond, env);
                if (cond.type.type !== 'Bool') throw new Error(`TypeError: Type Error in If condition: Expected Bool, got ${this.fmt(cond.type)}`);
                const t = this.checkExprFull(expr.then, env);
                const e = this.checkExprFull(expr.else, env);
                this.expectType(t.type, e.type, "If branches mismatch");
                return { type: t.type, eff: this.joinEffects(cond.eff, this.joinEffects(t.eff, e.eff)) };
            }

            case 'Match': {
                const target = this.checkExprFull(expr.target, env);
                let retType: IrisType | null = null;
                let joinedEff: IrisEffect = target.eff;

                const targetType = target.type;
                if (targetType.type === 'Option') {
                    for (const c of expr.cases) {
                        const newEnv = new Map(env);
                        if (c.tag === 'Some') {
                            if (c.vars.length !== 1) throw new Error("Some case expects 1 variable");
                            if (!targetType.inner) throw new Error("Internal error: Option type missing inner type");
                            newEnv.set(c.vars[0], targetType.inner);
                        } else if (c.tag === 'None') {
                            if (c.vars.length !== 0) throw new Error("None case expects 0 variables");
                        } else throw new Error(`Unknown option match tag: ${c.tag}`);

                        const body = this.checkExprFull(c.body, newEnv);
                        if (retType) this.expectType(retType, body.type, "Match arms mismatch");
                        else retType = body.type;
                        joinedEff = this.joinEffects(joinedEff, body.eff);
                    }
                } else if (targetType.type === 'Result') {
                    for (const c of expr.cases) {
                        const newEnv = new Map(env);
                        if (c.tag === 'Ok') {
                            if (c.vars.length !== 1) throw new Error("Ok case expects 1 variable");
                            if (!targetType.ok) throw new Error("Internal error: Result type missing ok type");
                            newEnv.set(c.vars[0], targetType.ok);
                        } else if (c.tag === 'Err') {
                            if (c.vars.length !== 1) throw new Error("Err case expects 1 variable");
                            if (!targetType.err) throw new Error("Internal error: Result type missing err type");
                            newEnv.set(c.vars[0], targetType.err);
                        } else throw new Error(`Unknown result match tag: ${c.tag}`);

                        const body = this.checkExprFull(c.body, newEnv);
                        if (retType) this.expectType(retType, body.type, "Match arms mismatch");
                        else retType = body.type;
                        joinedEff = this.joinEffects(joinedEff, body.eff);
                    }
                } else {
                    throw new Error(`Match target must be Option or Result (got ${targetType.type})`);
                }
                return { type: retType!, eff: joinedEff };
            }

            case 'Call': {
                let func = this.functions.get(expr.fn);

                if (!func && expr.fn.includes('.')) {
                    // Try to resolve imported function
                    const [alias, fname] = expr.fn.split('.');
                    const importDecl = this.currentProgram?.imports.find(i => i.alias === alias);
                    if (importDecl && this.resolver) {
                        const importedProg = this.resolver(importDecl.path);
                        if (importedProg) {
                            const targetDef = importedProg.defs.find(d => d.kind === 'DefFn' && d.name === fname) as any;
                            if (targetDef) {
                                func = {
                                    args: targetDef.args.map((a: any) => a.type), // re-parse type if needed, but it's AST
                                    ret: targetDef.ret,
                                    eff: targetDef.eff
                                };
                                // TODO: Recursive check of the imported module? 
                                // For v0.4 we assume imported modules are valid or we'd loop forever if circular.
                            }
                        }
                    }
                }

                if (!func) throw new Error(`TypeError: Unknown function call: ${expr.fn}`);
                if (expr.args.length !== func.args.length) throw new Error(`TypeError: Arity mismatch for ${expr.fn}`);
                let eff: IrisEffect = '!Pure';
                for (let i = 0; i < expr.args.length; i++) {
                    const arg = this.checkExprFull(expr.args[i], env);
                    this.expectType(func.args[i], arg.type, `Argument ${i} mismatch`);
                    eff = this.joinEffects(eff, arg.eff);
                }
                // Handle !Infer: if callee is !Infer, treat as !Any (pessimistic) unless we know better.
                const callEff = func.eff === '!Infer' ? '!Any' : func.eff;
                return { type: func.ret, eff: this.joinEffects(eff, callEff) };
            }

            case 'Record': {
                const fields: Record<string, IrisType> = {};
                let eff: IrisEffect = '!Pure';
                for (const [key, valExpr] of Object.entries(expr.fields)) {
                    const res = this.checkExprFull(valExpr, env);
                    fields[key] = res.type;
                    eff = this.joinEffects(eff, res.eff);
                }
                return { type: { type: 'Record', fields }, eff };
            }

            case 'Intrinsic': {
                let joinedEff: IrisEffect = '!Pure';
                const argTypes: IrisType[] = [];
                for (const arg of expr.args) {
                    const res = this.checkExprFull(arg, env);
                    argTypes.push(res.type);
                    joinedEff = this.joinEffects(joinedEff, res.eff);
                }

                // Pure Ops
                if (['+', '-', '*', '/', '<', '<=', '=', '>=', '>'].includes(expr.op)) {
                    // Check arg types
                    for (let i = 0; i < argTypes.length; i++) {
                        if (argTypes[i].type !== 'I64') {
                            // Equality allows others in theory, but v0 spec strict.
                            if (['+', '-', '*', '/'].includes(expr.op)) {
                                throw new Error(`TypeError: Type Error in ${expr.op} operand ${i + 1}: Expected I64, got ${argTypes[i].type}`);
                            }
                        }
                    }
                    return { type: ['<=', '<', '=', '>=', '>'].includes(expr.op) ? { type: 'Bool' } : { type: 'I64' }, eff: joinedEff };
                }

                if (expr.op === 'Some') return { type: { type: 'Option', inner: argTypes[0] }, eff: joinedEff };

                if (expr.op === 'Ok') return { type: { type: 'Result', ok: argTypes[0], err: { type: 'Str' } }, eff: joinedEff };
                if (expr.op === 'Err') return { type: { type: 'Result', ok: { type: 'I64' }, err: argTypes[0] }, eff: joinedEff };
                if (expr.op === 'cons') return { type: { type: 'List', inner: argTypes[0] }, eff: joinedEff }; // Simplified

                if (expr.op.startsWith('io.')) {
                    joinedEff = this.joinEffects(joinedEff, '!IO');
                    if (expr.op === 'io.read_file') return { type: { type: 'Result', ok: { type: 'Str' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'io.write_file') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'io.print') return { type: { type: 'I64' }, eff: joinedEff };
                }

                throw new Error(`Unknown intrinsic: ${expr.op}`);
            }

            default:
                throw new Error(`Unimplemented check for ${(expr as any).kind}`);
        }
    }

    private checkExpr(expr: Expr, env: Map<string, IrisType>): IrisType {
        // Legacy wrapper removed/inlined
        return this.checkExprFull(expr, env).type;
    }

    private expectType(expected: IrisType, actual: IrisType, message: string) {
        if (!this.typesEqual(expected, actual)) {
            throw new Error(`TypeError: ${message}: Expected ${this.fmt(expected)}, got ${this.fmt(actual)}`);
        }
    }

    private effectOrder(eff: IrisEffect): number {
        switch (eff) {
            case '!Pure': return 0;
            case '!IO': return 1;
            case '!Net': return 2;
            case '!Any': return 3;
            case '!Infer': return -1;
        }
        return 0; // fallback
    }

    private joinEffects(e1: IrisEffect, e2: IrisEffect): IrisEffect {
        if (e1 === '!Infer' || e2 === '!Infer') return '!Pure';
        const ord1 = this.effectOrder(e1);
        const ord2 = this.effectOrder(e2);

        if (e1 === '!Any' || e2 === '!Any') return '!Any';
        if (e1 === '!IO' || e2 === '!IO') return '!IO';
        return '!Pure';
    }

    private checkEffectSubtype(required: IrisEffect, declared: IrisEffect, message: string) {
        if (declared === '!Infer') return;
        if (declared === '!Any') return;

        const ordReq = this.effectOrder(required);
        const ordDecl = this.effectOrder(declared);

        if (ordReq > ordDecl) {
            throw new Error(`TypeError: EffectMismatch: ${message}: Inferred ${required} but declared ${declared}`);
        }
    }

    private typesEqual(t1: IrisType, t2: IrisType): boolean {
        if (t1.type !== t2.type) return false;
        if (t1.type === 'Option') {
            if (!t1.inner || !(t2 as any).inner) return false;
            return this.typesEqual(t1.inner, (t2 as any).inner);
        }
        if (t1.type === 'Result') {
            if (!t1.ok || !t1.err || !(t2 as any).ok || !(t2 as any).err) return false;
            return this.typesEqual(t1.ok, (t2 as any).ok) && this.typesEqual(t1.err, (t2 as any).err);
        }
        if (t1.type === 'Record') {
            const f1 = t1.fields;
            const f2 = (t2 as any).fields;
            const k1 = Object.keys(f1).sort();
            const k2 = Object.keys(f2).sort();
            if (k1.length !== k2.length) return false;
            for (let i = 0; i < k1.length; i++) {
                if (k1[i] !== k2[i]) return false;
                if (!this.typesEqual(f1[k1[i]], f2[k1[i]])) return false;
            }
            return true;
        }
        if (t1.type === 'List') {
            return this.typesEqual(t1.inner, (t2 as any).inner);
        }
        return true;
    }

    private fmt(t: IrisType): string {
        switch (t.type) {
            case 'I64': return 'I64';
            case 'Bool': return 'Bool';
            case 'Str': return 'Str';
            case 'Option': return `(Option ${this.fmt(t.inner)})`;
            case 'Result': return `(Result ${this.fmt(t.ok)} ${this.fmt(t.err)})`;
            case 'List': return `(List ${this.fmt(t.inner)})`;
            case 'Record': return `(Record ${Object.keys(t.fields).map(k => `(${k} ${this.fmt(t.fields[k])})`).join(' ')})`;
            default: return 'Unknown';
        }
    }
}
