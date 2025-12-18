
import { Expr, IrisType, IrisEffect, Value } from '../../types';
import { TypeCheckerContext, CheckFn } from '../context';
import { resolve, joinEffects, expectType, fmt } from '../utils';

export function checkControl(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    if (expr.kind === 'Let') {
        const letExpr = expr as any;
        if (!letExpr.value) console.log("Let expr missing value:", JSON.stringify(letExpr));
        const valRes = check(ctx, letExpr.value, env);
        const newEnv = new Map(env);
        newEnv.set(letExpr.name, valRes.type);
        const bodyRes = check(ctx, letExpr.body, newEnv, expectedType);
        return { type: bodyRes.type, eff: joinEffects(valRes.eff, bodyRes.eff) };
    }

    if (expr.kind === 'If') {
        const cond = check(ctx, expr.cond, env, { type: 'Bool' });
        expectType(ctx, { type: 'Bool' }, cond.type, "Type Error in If condition");
        const thenBr = check(ctx, expr.then, env, expectedType);
        const elseBr = check(ctx, expr.else, env, expectedType || thenBr.type);
        expectType(ctx, thenBr.type, elseBr.type, "If branches mismatch");
        return { type: expectedType || thenBr.type, eff: joinEffects(cond.eff, joinEffects(thenBr.eff, elseBr.eff)) };
    }

    if (expr.kind === 'Match') {
        const target = check(ctx, expr.target, env);
        let retType: IrisType | null = null;
        let joinedEff: IrisEffect = target.eff;

        let resolvedTarget = resolve(ctx, target.type);

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

                const body = check(ctx, c.body, newEnv, retType || expectedType);
                if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
                else retType = body.type;
                joinedEff = joinEffects(joinedEff, body.eff);
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

                const body = check(ctx, c.body, newEnv, retType || expectedType);
                if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
                else retType = body.type;
                joinedEff = joinEffects(joinedEff, body.eff);
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

                const body = check(ctx, c.body, newEnv, retType || expectedType);
                if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
                else retType = body.type;
                joinedEff = joinEffects(joinedEff, body.eff);
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
                    if (!variantType) throw new Error(`TypeError: Union ${fmt(ctx, resolvedTarget)} has no variant ${c.tag}`);

                    // For v0, assume 1 var binds to payload.
                    if (vars.length === 1) {
                        newEnv.set(vars[0], variantType);
                    } else if (vars.length === 0) {
                        // Unit payload or ignored
                    } else {
                        throw new Error(`Match case ${c.tag} expects 1 variable (payload binding)`);
                    }
                }

                const body = check(ctx, c.body, newEnv, retType || expectedType);
                if (retType) expectType(ctx, retType, body.type, "Match arms mismatch");
                else retType = body.type;
                joinedEff = joinEffects(joinedEff, body.eff);
            }
        } else {
            throw new Error(`Match target must be Option, Result, List, or Union (got ${resolvedTarget.type})`);
        }
        return { type: retType!, eff: joinedEff };
    }

    throw new Error(`Internal: checkControl called on non-control expr ${expr.kind}`);
}
