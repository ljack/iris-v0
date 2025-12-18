import { Program, Definition, Expr, IrisType, IrisEffect, IntrinsicOp, ModuleResolver } from './types';

export class TypeChecker {
    private functions = new Map<string, { args: IrisType[], ret: IrisType, eff: IrisEffect }>();
    private constants = new Map<string, IrisType>();
    private types = new Map<string, IrisType>();
    private currentProgram?: Program;

    constructor(private resolver?: ModuleResolver) { }

    check(program: Program) {
        this.currentProgram = program;

        // Pre-pass: load imported types
        if (this.resolver) {
            for (const imp of program.imports) {
                const mod = this.resolver(imp.path);
                if (mod) {
                    const exportedTypes = new Set(mod.defs.filter(d => d.kind === 'TypeDef').map(d => d.name));
                    for (const def of mod.defs) {
                        if (def.kind === 'TypeDef') {
                            const qualified = this.qualifyType(def.type, imp.alias, exportedTypes);
                            this.types.set(`${imp.alias}.${def.name}`, qualified);
                        }
                    }
                }
            }
        }

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
            } else if (def.kind === 'TypeDef') {
                this.types.set(def.name, def.type);
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
                if (def.name === 'type_check') console.log("Checking type_check. Ret:", JSON.stringify(def.ret));

                const { type: bodyType, eff: bodyEff } = this.checkExprFull(def.body, env, def.ret);

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
            } else if (def.kind === 'TypeDef') {
                // Nothing to check for body
            }
        }
    }

    private qualifyType(t: IrisType, alias: string, exported: Set<string>): IrisType {
        if (t.type === 'Named') {
            if (exported.has(t.name)) {
                return { type: 'Named', name: `${alias}.${t.name}` };
            }
            return t; // External or built-in
        }
        if (t.type === 'Option') return { ...t, inner: this.qualifyType(t.inner, alias, exported) };
        if (t.type === 'Result') return { ...t, ok: this.qualifyType(t.ok, alias, exported), err: this.qualifyType(t.err, alias, exported) };
        if (t.type === 'List') return { ...t, inner: this.qualifyType(t.inner, alias, exported) };
        if (t.type === 'Tuple') return { ...t, items: t.items.map(i => this.qualifyType(i, alias, exported)) };
        if (t.type === 'Record') {
            const newFields: any = {};
            for (const k in t.fields) newFields[k] = this.qualifyType(t.fields[k], alias, exported);
            return { ...t, fields: newFields };
        }
        if (t.type === 'Union') {
            const newVars: any = {};
            for (const k in t.variants) newVars[k] = this.qualifyType(t.variants[k], alias, exported);
            return { ...t, variants: newVars };
        }
        if (t.type === 'Map') return { ...t, key: this.qualifyType(t.key, alias, exported), value: this.qualifyType(t.value, alias, exported) };
        if (t.type === 'Fn') return {
            ...t,
            args: t.args.map(a => this.qualifyType(a, alias, exported)),
            ret: this.qualifyType(t.ret, alias, exported)
        };
        return t;
    }

    // Returns Type AND Inferred Effect
    private checkExprFull(expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
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
                if (val.kind === 'List') {
                    if (expectedType && expectedType.type === 'List') {
                        return { type: expectedType, eff: '!Pure' };
                    }
                    return { type: { type: 'List', inner: { type: 'I64' } }, eff: '!Pure' };
                }
                if (val.kind === 'Tuple') return { type: { type: 'Tuple', items: [] }, eff: '!Pure' };
                if (val.kind === 'Record') return { type: { type: 'Record', fields: {} }, eff: '!Pure' };
                throw new Error(`Unknown literal kind: ${(val as any).kind}`);
            }

            case 'Var': {
                if (env.has(expr.name)) return { type: env.get(expr.name)!, eff: '!Pure' };
                if (this.constants.has(expr.name)) return { type: this.constants.get(expr.name)!, eff: '!Pure' };

                // Dot access for records
                if (expr.name.includes('.')) {
                    const parts = expr.name.split('.');
                    let currentType = env.get(parts[0]) || this.constants.get(parts[0]);
                    if (currentType) {
                        for (let i = 1; i < parts.length; i++) {
                            currentType = this.resolve(currentType!);
                            if (currentType.type === 'Tuple') {
                                const index = parseInt(parts[i]);
                                if (isNaN(index)) throw new Error(`TypeError: Tuple index must be number: ${parts[i]}`);
                                if (!currentType.items) throw new Error("Internal: Tuple missing items");
                                if (index < 0 || index >= currentType.items.length) throw new Error(`TypeError: Tuple index out of bounds: ${index}`);
                                currentType = currentType.items[index];
                            } else {
                                if (currentType.type !== 'Record') throw new Error(`TypeError: Cannot access field ${parts[i]} of non-record ${parts.slice(0, i).join('.')}`);
                                if (!currentType.fields) throw new Error("Internal: Record missing fields");
                                const fields: Record<string, IrisType> = currentType.fields;
                                const fieldType: IrisType = fields[parts[i]];
                                if (!fieldType) throw new Error(`TypeError: Unknown field ${parts[i]} in record`);
                                currentType = fieldType;
                            }
                        }
                        return { type: currentType!, eff: '!Pure' };
                    }
                }

                throw new Error(`TypeError: Unknown variable: ${expr.name}`);
            }

            case 'Let': {
                const letExpr = expr as any;
                if (!letExpr.value) console.log("Let expr missing value:", JSON.stringify(letExpr));
                const valRes = this.checkExprFull(letExpr.value, env); // No expected type for let binding value usually (unless annotated?)
                const newEnv = new Map(env);
                newEnv.set(letExpr.name, valRes.type);
                const bodyRes = this.checkExprFull(letExpr.body, newEnv, expectedType);
                return { type: bodyRes.type, eff: this.joinEffects(valRes.eff, bodyRes.eff) };
            }

            case 'If': {
                const cond = this.checkExprFull(expr.cond, env, { type: 'Bool' });
                const thenBr = this.checkExprFull(expr.then, env, expectedType);
                const elseBr = this.checkExprFull(expr.else, env, expectedType || thenBr.type);
                if (expectedType && expectedType.type === 'Tuple' && (expectedType.items[1] as any).inner?.type === 'Str') {
                    // console.log("IF Expected:", this.fmt(expectedType));
                    // console.log("IF thenBr type:", this.fmt(thenBr.type));
                    // console.log("IF elseBr type:", this.fmt(elseBr.type));
                }
                this.expectType(thenBr.type, elseBr.type, "If branches mismatch");
                return { type: expectedType || thenBr.type, eff: this.joinEffects(cond.eff, this.joinEffects(thenBr.eff, elseBr.eff)) };
            }

            case 'Match': {
                const target = this.checkExprFull(expr.target, env);
                let retType: IrisType | null = null;
                let joinedEff: IrisEffect = target.eff;

                let resolvedTarget = arguments[2] as IrisType | undefined;
                resolvedTarget = this.resolve(target.type);

                if (resolvedTarget.type === 'Option') {
                    for (const c of expr.cases) {
                        const newEnv = new Map(env);
                        const vars: string[] = [];
                        if (c.vars.kind === 'List') {
                            for (const item of c.vars.items) {
                                if (item.kind === 'Str') vars.push(item.value);
                            }
                        }

                        if (c.tag === 'Some') {
                            if (vars.length !== 1) throw new Error("Some case expects 1 variable");
                            if (!resolvedTarget.inner) throw new Error("Internal error: Option type missing inner type");
                            newEnv.set(vars[0], resolvedTarget.inner);
                        } else if (c.tag === 'None') {
                            if (vars.length !== 0) throw new Error("None case expects 0 variables");
                        } else throw new Error(`Unknown option match tag: ${c.tag}`);

                        const body = this.checkExprFull(c.body, newEnv, retType || expectedType);
                        if (retType) this.expectType(retType, body.type, "Match arms mismatch");
                        else retType = body.type;
                        joinedEff = this.joinEffects(joinedEff, body.eff);
                    }
                } else if (resolvedTarget.type === 'Result') {
                    for (const c of expr.cases) {
                        const newEnv = new Map(env);
                        const vars: string[] = [];
                        if (c.vars.kind === 'List') {
                            for (const item of c.vars.items) {
                                if (item.kind === 'Str') vars.push(item.value);
                            }
                        }

                        if (c.tag === 'Ok') {
                            if (vars.length !== 1) throw new Error("Ok case expects 1 variable");
                            if (!resolvedTarget.ok) throw new Error("Internal error: Result type missing ok type");
                            newEnv.set(vars[0], resolvedTarget.ok);
                        } else if (c.tag === 'Err') {
                            if (vars.length !== 1) throw new Error("Err case expects 1 variable");
                            if (!resolvedTarget.err) throw new Error("Internal error: Result type missing err type");
                            newEnv.set(vars[0], resolvedTarget.err);
                        } else throw new Error(`Unknown result match tag: ${c.tag}`);

                        const body = this.checkExprFull(c.body, newEnv, retType || expectedType);
                        if (retType) this.expectType(retType, body.type, "Match arms mismatch");
                        else retType = body.type;
                        joinedEff = this.joinEffects(joinedEff, body.eff);
                    }
                } else if (resolvedTarget.type === 'List') {
                    for (const c of expr.cases) {
                        const newEnv = new Map(env);
                        const vars: string[] = [];
                        if (c.vars.kind === 'List') {
                            for (const item of c.vars.items) {
                                if (item.kind === 'Str') vars.push(item.value);
                            }
                        }

                        if (c.tag === 'nil') {
                            if (vars.length !== 0) throw new Error("nil case expects 0 variables");
                        } else if (c.tag === 'cons') {
                            if (vars.length !== 2) throw new Error("cons case expects 2 variables (head tail)");
                            if (!resolvedTarget.inner) throw new Error("Internal List missing inner");
                            newEnv.set(vars[0], resolvedTarget.inner!); // head
                            newEnv.set(vars[1], resolvedTarget);       // tail
                        } else throw new Error(`Unknown list match tag: ${c.tag}`);

                        const body = this.checkExprFull(c.body, newEnv, retType || expectedType);
                        if (retType) this.expectType(retType, body.type, "Match arms mismatch");
                        else retType = body.type;
                        joinedEff = this.joinEffects(joinedEff, body.eff);
                    }
                } else if (resolvedTarget.type === 'Union') {
                    for (const c of expr.cases) {
                        const newEnv = new Map(env);
                        const vars: string[] = [];
                        if (c.vars.kind === 'List') {
                            for (const item of c.vars.items) {
                                if (item.kind === 'Str') vars.push(item.value);
                            }
                        }

                        if (c.tag === '_') {
                            if (vars.length !== 0) throw new Error("Wildcard match cannot bind variables");
                        } else {
                            const variantType = resolvedTarget.variants[c.tag];
                            if (!variantType) throw new Error(`TypeError: Union ${this.fmt(resolvedTarget)} has no variant ${c.tag}`);

                            // For v0, assume 1 var binds to payload.
                            if (vars.length === 1) {
                                newEnv.set(vars[0], variantType);
                            } else if (vars.length === 0) {
                                // Unit payload or ignored
                            } else {
                                throw new Error(`Match case ${c.tag} expects 1 variable (payload binding)`);
                            }
                        }

                        const body = this.checkExprFull(c.body, newEnv, retType || expectedType);
                        if (retType) this.expectType(retType, body.type, "Match arms mismatch");
                        else retType = body.type;
                        joinedEff = this.joinEffects(joinedEff, body.eff);
                    }
                } else {
                    throw new Error(`Match target must be Option, Result, List, or Union (got ${resolvedTarget.type})`);
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
                    const arg = this.checkExprFull(expr.args[i], env, func.args[i]);
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

                let expectedFields: Record<string, IrisType> | undefined;
                if (expectedType) {
                    const resolved = this.resolve(expectedType);
                    if (resolved.type === 'Record') {
                        expectedFields = resolved.fields;
                    }
                }

                for (const [key, valExpr] of Object.entries(expr.fields)) {
                    const expectedFieldType = expectedFields ? expectedFields[key] : undefined;
                    const res = this.checkExprFull(valExpr, env, expectedFieldType);
                    fields[key] = res.type;
                    eff = this.joinEffects(eff, res.eff);
                }
                return { type: { type: 'Record', fields }, eff };
            }

            case 'Tagged': {
                // (tag "Name" (val))
                let expectHint: IrisType | undefined;
                let resolvedExpect: IrisType | undefined;

                if (expectedType) {
                    resolvedExpect = this.resolve(expectedType);
                    if (resolvedExpect.type === 'Union') {
                        const variantType = resolvedExpect.variants[expr.tag];
                        if (variantType) {
                            expectHint = variantType;
                        }
                    } else if (resolvedExpect.type === 'Result') {
                        if (expr.tag === 'Ok') expectHint = resolvedExpect.ok;
                        else if (expr.tag === 'Err') expectHint = resolvedExpect.err;
                    } else if (resolvedExpect.type === 'Option') {
                        if (expr.tag === 'Some') expectHint = resolvedExpect.inner;
                    }
                }

                const valRes = this.checkExprFull(expr.value, env, expectHint);

                if (resolvedExpect) {
                    if (resolvedExpect.type === 'Union') {
                        // Check variant existence handling above already?
                        // If variant exists, we used hint. If not, expectHint is undefined.
                        // We should re-check variant existence to be safe or rely on valRes check?
                        // ValRes check verified against hint.
                        // We strictly return expectedType which describes the whole Union.
                        if (resolvedExpect.variants[expr.tag]) return { type: expectedType!, eff: valRes.eff };
                    } else if (resolvedExpect.type === 'Result') {
                        if (expr.tag === 'Ok') return { type: expectedType!, eff: valRes.eff };
                        if (expr.tag === 'Err') return { type: expectedType!, eff: valRes.eff };
                    } else if (resolvedExpect.type === 'Option') {
                        if (expr.tag === 'Some') return { type: expectedType!, eff: valRes.eff };
                        if (expr.tag === 'None') return { type: expectedType!, eff: valRes.eff };
                    }
                }

                const retType: IrisType = { type: 'Union', variants: { [expr.tag]: valRes.type } };
                return { type: retType, eff: valRes.eff };
            }

            case 'Tuple': {
                const items: IrisType[] = [];
                let eff: IrisEffect = '!Pure';

                let expectedItems: IrisType[] | undefined;
                if (expectedType) {
                    const resolved = this.resolve(expectedType);
                    if (resolved.type === 'Tuple') {
                        expectedItems = resolved.items;
                    }
                }

                for (let i = 0; i < expr.items.length; i++) {
                    const item = expr.items[i];
                    const expect = expectedItems ? expectedItems[i] : undefined;
                    const res = this.checkExprFull(item, env, expect);
                    items.push(res.type);
                    eff = this.joinEffects(eff, res.eff);
                }

                // If we had expected items, we validated against them (recursively via expectedType passed to checkExprFull).
                // But if the returned type from item check is distinct (e.g. strict supertype?), we might need strict check?
                // checkExprFull returns inferred type or expected type if coerced.

                const retType: IrisType = { type: 'Tuple', items };
                if (expectedType && this.fmt(expectedType).includes("List Str")) {
                    // console.log("TUPLE returning:", this.fmt(retType));
                }
                return { type: retType, eff };
            }

            case 'List': {
                const items: IrisType[] = [];
                let eff: IrisEffect = '!Pure';

                let expectedInner: IrisType | undefined;
                if (expectedType) {
                    const resolved = this.resolve(expectedType);
                    if (resolved.type === 'List') {
                        expectedInner = resolved.inner;
                    }
                }

                if (expr.items.length === 0) {
                    if (expectedInner) {
                        return { type: { type: 'List', inner: expectedInner }, eff: '!Pure' };
                    }
                    if (expr.typeArg) {
                        return { type: { type: 'List', inner: expr.typeArg }, eff: '!Pure' };
                    }
                    return { type: { type: 'List', inner: { type: 'I64' } }, eff: '!Pure' };
                }

                // If items exist, infer from first or expected
                let innerType = expectedInner;

                for (const item of expr.items) {
                    const res = this.checkExprFull(item, env, innerType);
                    if (!innerType) innerType = res.type;
                    else this.expectType(innerType, res.type, "List item type mismatch");
                    eff = this.joinEffects(eff, res.eff);
                }

                return { type: { type: 'List', inner: innerType! }, eff };
            }

            case 'Intrinsic': {
                // Pre-check for constructors to pass hints
                let argHints: (IrisType | undefined)[] = [];
                if (expectedType) {
                    const resolved = this.resolve(expectedType);
                    // console.log("Intrinsic hint check:", expr.op, resolved.type);
                    if (expr.op === 'Ok' && resolved.type === 'Result') argHints = [resolved.ok];
                    else if (expr.op === 'Err' && resolved.type === 'Result') argHints = [resolved.err];
                    else if (expr.op === 'Some' && resolved.type === 'Option') argHints = [resolved.inner];
                    else if (expr.op === 'cons' && resolved.type === 'List') argHints = [resolved.inner, resolved];
                }

                if (['Ok', 'Err', 'Some'].includes(expr.op)) {
                    // console.log("Check Intrinsic", expr.op, "Hints:", argHints.length);
                }

                const argTypes: IrisType[] = [];
                let joinedEff: IrisEffect = '!Pure';
                for (let i = 0; i < expr.args.length; i++) {
                    const arg = expr.args[i];
                    const hint = argHints[i];
                    const res = this.checkExprFull(arg, env, hint);

                    argTypes.push(res.type);
                    joinedEff = this.joinEffects(joinedEff, res.eff);
                }

                // Pure Ops
                if (['+', '-', '*', '/', '%', '<', '<=', '=', '>=', '>'].includes(expr.op)) {
                    // Check arg types
                    if (['+', '-', '*', '/', '%'].includes(expr.op)) {
                        for (let i = 0; i < argTypes.length; i++) {
                            if (argTypes[i].type !== 'I64') {
                                throw new Error(`TypeError: Type Error in ${expr.op} operand ${i + 1}: Expected I64, got ${argTypes[i].type}`);
                            }
                        }
                        if (argTypes.length !== 2) throw new Error(`${expr.op} expects 2 operands`);
                        return { type: { type: 'I64' }, eff: joinedEff };
                    }
                    return { type: ['<=', '<', '=', '>=', '>'].includes(expr.op) ? { type: 'Bool' } : { type: 'I64' }, eff: joinedEff };
                }

                if (['&&', '||'].includes(expr.op)) {
                    for (let i = 0; i < argTypes.length; i++) {
                        if (argTypes[i].type !== 'Bool') throw new Error(`TypeError: Expected Bool for ${expr.op}`);
                    }
                    return { type: { type: 'Bool' }, eff: joinedEff };
                }
                if (expr.op === '!') {
                    if (argTypes.length !== 1 || argTypes[0].type !== 'Bool') throw new Error("TypeError: ! expects 1 Bool");
                    return { type: { type: 'Bool' }, eff: joinedEff };
                }

                if (expr.op === 'Some') return { type: { type: 'Option', inner: argTypes[0] }, eff: joinedEff };

                if (expr.op === 'Ok') {
                    let errType: IrisType = { type: 'Str' };
                    if (expectedType) {
                        const resolved = this.resolve(expectedType);
                        if (resolved.type === 'Result') errType = resolved.err;
                    }
                    return { type: { type: 'Result', ok: argTypes[0], err: errType }, eff: joinedEff };
                }
                if (expr.op === 'Err') {
                    let okType: IrisType = { type: 'I64' };
                    if (expectedType) {
                        const resolved = this.resolve(expectedType);
                        if (resolved.type === 'Result') okType = resolved.ok;
                    }
                    return { type: { type: 'Result', ok: okType, err: argTypes[0] }, eff: joinedEff };
                }
                if (expr.op === 'cons') return { type: { type: 'List', inner: argTypes[0] }, eff: joinedEff }; // Simplified

                if (expr.op.startsWith('io.')) {
                    joinedEff = this.joinEffects(joinedEff, '!IO');
                    if (expr.op === 'io.read_file') return { type: { type: 'Result', ok: { type: 'Str' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'io.write_file') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'io.file_exists') return { type: { type: 'Bool' }, eff: joinedEff };
                    if (expr.op === 'io.read_dir') return { type: { type: 'Result', ok: { type: 'List', inner: { type: 'Str' } }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'io.print') return { type: { type: 'I64' }, eff: joinedEff };
                }

                // Concurrency
                if (expr.op.startsWith('sys.')) {
                    joinedEff = this.joinEffects(joinedEff, '!IO'); // Sys ops are generally IO-effecting
                    if (expr.op === 'sys.self') {
                        if (argTypes.length !== 0) throw new Error("sys.self expects 0 arguments");
                        return { type: { type: 'I64' }, eff: joinedEff };
                    }
                    if (expr.op === 'sys.recv') {
                        if (argTypes.length !== 0) throw new Error("sys.recv expects 0 arguments");
                        return { type: { type: 'Str' }, eff: joinedEff };
                    }
                    if (expr.op === 'sys.spawn') {
                        if (argTypes.length !== 1) throw new Error("sys.spawn expects 1 argument");
                        if (argTypes[0].type !== 'Str') throw new Error("sys.spawn expects Str function name");
                        return { type: { type: 'I64' }, eff: joinedEff };
                    }
                    if (expr.op === 'sys.sleep') {
                        if (argTypes.length !== 1) throw new Error("sys.sleep expects 1 argument");
                        if (argTypes[0].type !== 'I64') throw new Error("sys.sleep expects I64 ms");
                        return { type: { type: 'Bool' }, eff: joinedEff };
                    }
                    if (expr.op === 'sys.send') {
                        if (argTypes.length !== 2) throw new Error("sys.send expects 2 arguments (pid, msg)");
                        const [pid, msg] = argTypes;
                        if (pid.type !== 'I64') throw new Error("sys.send expects I64 pid");
                        if (msg.type !== 'Str') throw new Error("sys.send expects Str msg");
                        return { type: { type: 'Bool' }, eff: joinedEff };
                    }
                }

                if (expr.op.startsWith('net.')) {
                    joinedEff = this.joinEffects(joinedEff, '!Net');
                    // Mock types for now (using I64 as handles)
                    if (expr.op === 'net.listen') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'net.accept') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'net.read') return { type: { type: 'Result', ok: { type: 'Str' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'net.write') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'net.close') return { type: { type: 'Result', ok: { type: 'Bool' }, err: { type: 'Str' } }, eff: joinedEff };
                    if (expr.op === 'net.connect') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
                }

                if (expr.op.startsWith('str.')) {
                    if (expr.op === 'str.len') {
                        if (argTypes.length !== 1) throw new Error("str.len expects 1 arg");
                        if (argTypes[0].type !== 'Str') throw new Error("str.len expects Str");
                        return { type: { type: 'I64' }, eff: joinedEff };
                    }
                    if (expr.op === 'str.concat') return { type: { type: 'Str' }, eff: joinedEff };
                    if (expr.op === 'str.contains' || expr.op === 'str.ends_with') return { type: { type: 'Bool' }, eff: joinedEff };
                    if (expr.op === 'str.get') {
                        if (argTypes.length !== 2) throw new Error("str.get expects 2 args (str, index)");
                        if (argTypes[0].type !== 'Str') throw new Error("str.get expects Str");
                        if (argTypes[1].type !== 'I64') throw new Error("str.get expects I64 index");
                        return { type: { type: 'Option', inner: { type: 'I64' } }, eff: joinedEff };
                    }
                    if (expr.op === 'str.substring') {
                        if (argTypes.length !== 3) throw new Error("str.substring expects 3 args (str, start, end)");
                        if (argTypes[0].type !== 'Str') throw new Error("str.substring expects Str");
                        if (argTypes[1].type !== 'I64') throw new Error("str.substring expects I64 start");
                        if (argTypes[2].type !== 'I64') throw new Error("str.substring expects I64 end");
                        return { type: { type: 'Str' }, eff: joinedEff };
                    }
                    if (expr.op === 'str.from_code') {
                        if (argTypes.length !== 1) throw new Error("str.from_code expects 1 arg (code)");
                        if (argTypes[0].type !== 'I64') throw new Error("str.from_code expects I64");
                        if (argTypes[0].type !== 'I64') throw new Error("str.from_code expects I64");
                        return { type: { type: 'Str' }, eff: joinedEff };
                    }
                    if (expr.op === 'str.index_of') {
                        if (argTypes.length !== 2) throw new Error("str.index_of expects 2 args (str, substr)");
                        if (argTypes[0].type !== 'Str') throw new Error("str.index_of expects Str");
                        if (argTypes[1].type !== 'Str') throw new Error("str.index_of expects Str substring");
                        return { type: { type: 'Option', inner: { type: 'I64' } }, eff: joinedEff };
                    }
                }

                if (expr.op.startsWith('map.')) {
                    if (expr.op === 'map.make') {
                        if (argTypes.length !== 2) throw new Error("map.make expects 2 arguments (key_witness, value_witness)");

                        if (expectedType) {
                            const resolved = this.resolve(expectedType);
                            if (resolved.type === 'Map') return { type: expectedType, eff: joinedEff };
                        }

                        // Pure
                        return { type: { type: 'Map', key: argTypes[0], value: argTypes[1] }, eff: joinedEff };
                    }
                    if (expr.op === 'map.put') {
                        if (argTypes.length !== 3) throw new Error("map.put expects 3 args (map, key, value)");
                        const [m, k, v] = argTypes;
                        if (m.type !== 'Map') throw new Error("map.put expects Map as first arg");
                        this.expectType(m.key, k, "map.put key mismatch");
                        this.expectType(m.value, v, "map.put value mismatch");
                        return { type: m, eff: joinedEff };
                    }
                    if (expr.op === 'map.get') {
                        if (argTypes.length !== 2) throw new Error("map.get expects 2 args (map, key)");
                        const [m, k] = argTypes;
                        if (m.type !== 'Map') throw new Error("map.get expects Map as first arg");
                        this.expectType(m.key, k, "map.get key mismatch");
                        return { type: { type: 'Option', inner: m.value }, eff: joinedEff };
                    }
                    if (expr.op === 'map.contains') {
                        if (argTypes.length !== 2) throw new Error("map.contains expects 2 args (map, key)");
                        const [m, k] = argTypes;
                        if (m.type !== 'Map') throw new Error("map.contains expects Map as first arg");
                        this.expectType(m.key, k, "map.contains key mismatch");
                        return { type: { type: 'Bool' }, eff: joinedEff };
                    }
                    if (expr.op === 'map.keys') {
                        if (argTypes.length !== 1) throw new Error("map.keys expects 1 arg (map)");
                        const m = argTypes[0];
                        if (m.type !== 'Map') throw new Error("map.keys expects Map");
                        return { type: { type: 'List', inner: m.key }, eff: joinedEff };
                    }
                }

                if (expr.op.startsWith('list.')) {
                    if (expr.op === 'list.length') {
                        if (argTypes.length !== 1) throw new Error("list.length expects 1 arg (list)");
                        if (argTypes[0].type !== 'List') throw new Error("list.length expects List");
                        return { type: { type: 'I64' }, eff: joinedEff };
                    }
                    if (expr.op === 'list.get') {
                        if (argTypes.length !== 2) throw new Error("list.get expects 2 args (list, index)");
                        const [l, idx] = argTypes;
                        if (l.type !== 'List') throw new Error("list.get expects List");
                        if (idx.type !== 'I64') throw new Error("list.get expects I64 index");
                        return { type: { type: 'Option', inner: l.inner }, eff: joinedEff };
                    }
                    if (expr.op === 'list.concat') {
                        if (argTypes.length !== 2) throw new Error("list.concat expects 2 args (list1, list2)");
                        const [l1, l2] = argTypes;
                        if (l1.type !== 'List' || l2.type !== 'List') throw new Error("list.concat expects two Lists");
                        return { type: l1, eff: joinedEff };
                    }
                    if (expr.op === 'list.unique') {
                        if (argTypes.length !== 1) throw new Error("list.unique expects 1 arg (list)");
                        return { type: argTypes[0], eff: joinedEff };
                    }
                }

                if (expr.op === 'i64.from_string') {
                    if (argTypes.length !== 1) throw new Error("i64.from_string expects 1 arg (Str)");
                    if (argTypes[0].type !== 'Str') throw new Error("i64.from_string expects Str");
                    return { type: { type: 'I64' }, eff: joinedEff };
                }

                if (expr.op === 'i64.to_string') {
                    if (argTypes.length !== 1) throw new Error("i64.to_string expects 1 arg (I64)");
                    if (argTypes[0].type !== 'I64') throw new Error("i64.to_string expects I64");
                    return { type: { type: 'Str' }, eff: joinedEff };
                }

                if (expr.op === 'tuple.get') {
                    if (argTypes.length !== 2) throw new Error("tuple.get expects 2 args (tuple, index)");
                    const [t, idx] = argTypes;
                    if (t.type !== 'Tuple') throw new Error("tuple.get expects Tuple");
                    if (idx.type !== 'I64') throw new Error("tuple.get expects I64 index");
                    // We can't know the type of element at runtime index during static analysis unless index is literal.
                    // But here index is likely I64 runtime value.
                    // Limitation of simple type system with heterogenous tuples accessed by runtime index.
                    // For now, assume Tuple is homogenous? No, definition says items: IrisType[].
                    // If we access with literal, we could know.
                    // If we access with variable, we return !Any or Union?
                    // For v0, let's just return !Any or assume user knows (Effect !Infer?).
                    // Actually, let's treat it as returning the Union of all item types?
                    // Or, simpler: Require literal index? 
                    // Let's check `lexer.iris`. We will access 0 and 1.
                    // Can we check if the argument is a Literal?
                    // In `checkExprFull`, we resolved `idx` expr. If it was literal, we have it? 
                    // No, `val` in checkExprFull is not passed to typechecker logic directly unless we store it.
                    // But `expr.args[1]` is accessible.
                    if (expr.args[1].kind === 'Literal' && expr.args[1].value.kind === 'I64') {
                        const i = Number(expr.args[1].value.value);
                        if (i < 0 || i >= t.items.length) throw new Error("tuple.get index out of bounds");
                        return { type: t.items[i], eff: joinedEff };
                    }
                    // Fallback if not literal: Error or unsafe?
                    // Let's throw Error "tuple.get requires literal index" for now to be safe.
                    throw new Error("tuple.get requires literal index for type safety");
                }

                if (expr.op === 'record.get') {
                    if (argTypes.length !== 2) throw new Error("record.get expects 2 args");
                    const [rec, k] = argTypes;
                    if (rec.type !== 'Record') throw new Error("record.get expects Record");
                    if (k.type !== 'Str') throw new Error("record.get expects Str key");

                    if (expr.args[1].kind === 'Literal' && expr.args[1].value.kind === 'Str') {
                        const keyVal = expr.args[1].value.value;
                        const fieldType = rec.fields[keyVal];
                        if (!fieldType) throw new Error(`Record has no field '${keyVal}'`);
                        return { type: fieldType, eff: joinedEff };
                    }
                    throw new Error("record.get requires literal string key");
                }

                if (expr.op === 'http.parse_request') {
                    // Result<HttpRequest, Str>
                    // HttpRequest = { method: Str, path: Str, headers: List<(Record (key Str) (val Str))>, body: Str }
                    joinedEff = this.joinEffects(joinedEff, '!Pure'); // Parsing is pure!

                    const headerType: IrisType = {
                        type: 'Record',
                        fields: { key: { type: 'Str' }, val: { type: 'Str' } }
                    };

                    const httpReqType: IrisType = {
                        type: 'Record',
                        fields: {
                            method: { type: 'Str' },
                            path: { type: 'Str' },
                            headers: { type: 'List', inner: headerType },
                            body: { type: 'Str' }
                        }
                    };

                    return {
                        type: { type: 'Result', ok: httpReqType, err: { type: 'Str' } },
                        eff: joinedEff
                    };
                }

                if (expr.op === 'http.parse_response') {
                    // Result<HttpResponse, Str>
                    // HttpResponse = { version: Str, status: I64, headers: List<(Record (key Str) (val Str))>, body: Str }
                    joinedEff = this.joinEffects(joinedEff, '!Pure');

                    const headerType: IrisType = {
                        type: 'Record',
                        fields: { key: { type: 'Str' }, val: { type: 'Str' } }
                    };

                    const httpResType: IrisType = {
                        type: 'Record',
                        fields: {
                            version: { type: 'Str' },
                            status: { type: 'I64' },
                            headers: { type: 'List', inner: headerType },
                            body: { type: 'Str' }
                        }
                    };

                    return {
                        type: { type: 'Result', ok: httpResType, err: { type: 'Str' } },
                        eff: joinedEff
                    };
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

        if (e1 === '!Any' || e2 === '!Any') return '!Any';
        if (e1 === '!Net' || e2 === '!Net') return '!Net';
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

    private resolve(t: IrisType): IrisType {
        if (t.type === 'Named') {
            if (this.types.has(t.name)) {
                return this.resolve(this.types.get(t.name)!);
            }
            // If unknown, return as is (will likely fail equality check later or fmt as Unknown)
            return t;
        }
        return t;
    }

    private typesEqual(t1: IrisType, t2: IrisType): boolean {
        const origT1 = t1;
        const origT2 = t2;
        t1 = this.resolve(t1);
        t2 = this.resolve(t2);

        if (t1 === t2) return true;

        if (t1.type !== t2.type) {
            // Check Union ~ Tuple compatibility mismatch
            if (t1.type === 'Union' && t2.type === 'Tuple') {
                // New logic: If t2 is a single-element tuple, and its inner type matches a variant of t1 (Union)
                if (t2.items.length === 1) {
                    const content = t2.items[0];
                    for (const variantType of Object.values(t1.variants)) {
                        if (this.typesEqual(variantType, content)) return true;
                    }
                }
                // Existing logic: Union vs Tagged Tuple
                if (t2.items.length === 2 && t2.items[0].type === 'Str') {
                    const content = t2.items[1];
                    for (const variantType of Object.values(t1.variants)) {
                        if (this.typesEqual(variantType, content)) return true;
                    }
                }
            }
            return false;
        }

        if (t1.type === 'Named') return t1.name === (t2 as any).name;
        if (t1.type === 'I64') return true;
        if (t1.type === 'Bool') return true;
        if (t1.type === 'Str') return true;

        if (t1.type === 'Union' && t2.type === 'Union') {
            // Subtyping: t1 expected, t2 actual. t2 must be subset of t1?
            // Or t1 subset of t2?
            // Usually expectation is wider. So t2 variants must be subset of t1.
            // Every variant in t2 must exist in t1 and be compatible.
            const t1Vars = (t1 as any).variants;
            const t2Vars = (t2 as any).variants;
            for (const [tag, type] of Object.entries(t2Vars)) {
                if (!t1Vars[tag]) return false;
                if (!this.typesEqual(t1Vars[tag], type as IrisType)) return false;
            }
            return true;
        }

        if (t1.type === 'Record' && t2.type === 'Record') {
            // Record subtyping? Or strict equality?
            // Iris v0 implies strict equality usually, but structural.
            const k1 = Object.keys((t1 as any).fields).sort();
            const k2 = Object.keys((t2 as any).fields).sort();
            if (k1.length !== k2.length) return false;
            for (let i = 0; i < k1.length; i++) {
                if (k1[i] !== k2[i]) return false;
                if (!this.typesEqual((t1 as any).fields[k1[i]], (t2 as any).fields[k2[i]])) return false;
            }
            return true;
        }

        // ... tuple, list checks ...
        // Existing logic fallback logic might handle structural equality implicitly?
        // Ah, default return false.

        if (t1.type === 'Option') {
            if (!(t1 as any).inner || !(t2 as any).inner) return false;
            return this.typesEqual((t1 as any).inner, (t2 as any).inner);
        }
        if (t1.type === 'Result') {
            if (!(t1 as any).ok || !(t1 as any).err || !(t2 as any).ok || !(t2 as any).err) return false;
            return this.typesEqual((t1 as any).ok, (t2 as any).ok) && this.typesEqual((t1 as any).err, (t2 as any).err);
        }
        if (t1.type === 'Record') { // Handled above? Duplicate check? No, Record handled merged.
            // If merged above, this block is unreachable or specific for strict record?
            // My previous edit merged Record logic. 
            // But existing logic had Record logic too?
            // Let's keep consistent.
            const f1 = (t1 as any).fields;
            const f2 = (t2 as any).fields;
            if (!f1 || !f2) return false;
            // ... logic same as above ...
            // Let's assume handled.
        }

        if (t1.type === 'List') {
            if (!(t1 as any).inner || !(t2 as any).inner) return false;
            return this.typesEqual((t1 as any).inner, (t2 as any).inner);
        }
        if (t1.type === 'Map') {
            if (!(t1 as any).key || !(t1 as any).value || !(t2 as any).key || !(t2 as any).value) return false;
            return this.typesEqual((t1 as any).key, (t2 as any).key) && this.typesEqual((t1 as any).value, (t2 as any).value);
        }
        if (t1.type === 'Tuple') {
            const i1 = (t1 as any).items;
            const i2 = (t2 as any).items;
            if (!i1 || !i2 || i1.length !== i2.length) return false;
            for (let i = 0; i < i1.length; i++) {
                if (!this.typesEqual(i1[i], i2[i])) return false;
            }
            return true;
        }

        // Union vs Tagged Tuple legacy check
        if (t1.type === 'Union') {
            // New Check for Tuple vs Union (Tagged Tuple)
            if (t2.type === 'Tuple' && (t2 as any).items.length === 2 && (t2 as any).items[0].type === 'Str') {
                const content = (t2 as any).items[1];
                for (const variantType of Object.values((t1 as any).variants)) {
                    // console.log("Checking variant", this.fmt(variantType), "vs", this.fmt(content));
                    if (this.typesEqual(variantType as IrisType, content)) return true;
                }
            }
            // Strict Union check
            if (t2.type === 'Union') {
                const v1 = (t1 as any).variants;
                const v2 = (t2 as any).variants;
                for (const [tag, type] of Object.entries(v2)) {
                    if (!v1[tag]) return false;
                    if (!this.typesEqual(v1[tag] as IrisType, type as IrisType)) return false;
                }
                return true;
            }
        }



        return false;
    }

    private fmt(t: IrisType): string {
        if (t.type === 'Named') return t.name;

        const resolved = this.resolve(t);
        if (resolved !== t && resolved.type !== 'Named') return this.fmt(resolved);

        switch (t.type) {
            case 'I64': return 'I64';
            case 'Bool': return 'Bool';
            case 'Str': return 'Str';
            case 'Option': return `(Option ${this.fmt(t.inner)})`;
            case 'Result': return `(Result ${this.fmt(t.ok)} ${this.fmt(t.err)})`;
            case 'List': return `(List ${this.fmt(t.inner)})`;
            case 'Tuple': return `(Tuple ${t.items.map(i => this.fmt(i)).join(' ')})`;
            case 'Map': return `(Map ${this.fmt(t.key)} ${this.fmt(t.value)})`;
            case 'Record': return `(Record ${Object.keys(t.fields).map(k => `(${k} ${this.fmt(t.fields[k])})`).join(' ')})`;
            case 'Union': return `(Union ${Object.keys(t.variants).map(k => `(tag "${k}" ${this.fmt(t.variants[k])})`).join(' ')})`;
            default: return 'Unknown';
        }
    }
}
