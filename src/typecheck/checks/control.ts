
import { Expr, IrisType, IrisEffect, Value } from '../../types';
import { TypeCheckerContext, CheckFn } from '../context';
import { resolve, joinEffects, expectType, fmt } from '../utils';

export function checkControl(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    const spanSuffix = (span?: { line: number; col: number }) => span ? ` at ${span.line}:${span.col}` : '';
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
                    if (vars.length !== 1) throw new Error(`TypeError: Ok case expects 1 variable${spanSuffix(c.tagSpan)}`);
                    if (!resolvedTarget.ok) throw new Error("Internal error: Result type missing ok type");
                    newEnv.set(vars[0], resolvedTarget.ok);
                } else if (c.tag === 'Err') {
                    if (vars.length !== 1) throw new Error(`TypeError: Err case expects 1 variable${spanSuffix(c.tagSpan)}`);
                    if (!resolvedTarget.err) throw new Error("Internal error: Result type missing err type");
                    newEnv.set(vars[0], resolvedTarget.err);
                } else throw new Error(`TypeError: Unknown result match tag: ${c.tag}${spanSuffix(c.tagSpan)}`);

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
                    if (vars.length !== 0) throw new Error(`TypeError: nil case expects 0 variables${spanSuffix(c.tagSpan)}`);
                } else if (c.tag === 'cons') {
                    if (vars.length !== 2) throw new Error(`TypeError: cons case expects 2 variables (head tail)${spanSuffix(c.tagSpan)}`);
                    if (!resolvedTarget.inner) throw new Error("Internal List missing inner");
                    newEnv.set(vars[0], resolvedTarget.inner!); // head
                    newEnv.set(vars[1], resolvedTarget);       // tail
                } else throw new Error(`TypeError: Unknown list match tag: ${c.tag}${spanSuffix(c.tagSpan)}`);

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
                    if (vars.length !== 0) throw new Error(`TypeError: Wildcard match cannot bind variables${spanSuffix(c.tagSpan)}`);
                } else {
                    const variantType = resolvedTarget.variants[c.tag];
                    if (!variantType) throw new Error(`TypeError: Union ${fmt(ctx, resolvedTarget)} has no variant ${c.tag}${spanSuffix(c.tagSpan)}`);

                    // For v0, assume 1 var binds to payload.
                    if (vars.length === 1) {
                        newEnv.set(vars[0], variantType);
                    } else if (vars.length === 0) {
                        // Unit payload or ignored
                    } else {
                        throw new Error(`TypeError: Match case ${c.tag} expects 1 variable (payload binding)${spanSuffix(c.tagSpan)}`);
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

export function checkLambda(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    if (expr.kind !== 'Lambda') throw new Error("Internal: checkLambda called on non-Lambda");

    const newEnv = new Map(env);

    // Add args to env
    const argTypes: IrisType[] = [];
    for (const arg of expr.args) {
        newEnv.set(arg.name, arg.type);
        argTypes.push(arg.type);
    }

    // Check body
    const bodyRes = check(ctx, expr.body, newEnv, expr.ret);
    expectType(ctx, expr.ret, bodyRes.type, "Lambda body type mismatch");

    // Check effect
    // If declared eff is !Pure, body must be !Pure
    // If declared is !IO, body can be !Pure or !IO
    // Similar for !Net -> !IO -> !Pure
    // Actually, we should use joinEffects or sub-effect check logic.
    // For now, strict equality or sub-effect.
    // Assuming simple sub-effect logic:
    // !Pure <= !IO <= !Net

    // Check effect compatibility
    // if body has 'eff', can we define it as 'expr.eff'?
    // e.g. body !Pure, expr !Pure -> OK
    // body !IO, expr !Pure -> Error

    // Helper to check if actual fits in declared
    const canEffectFit = (actual: IrisEffect, declared: IrisEffect): boolean => {
        if (declared === '!Any') return true;
        if (declared === '!Net') return ['!Pure', '!IO', '!Net', '!Infer'].includes(actual); // Infer usually means IO?
        if (declared === '!IO') return ['!Pure', '!IO', '!Infer'].includes(actual);
        if (declared === '!Pure') return actual === '!Pure';
        return false;
    };

    // Note: !Infer from body means it's likely impure or IO if it called something unknown, 
    // but if it's purely inferred as Pure, it's Pure.
    // However, body checking returns concrete effect usually.

    if (!canEffectFit(bodyRes.eff, expr.eff)) {
        // Allow !Infer to pass if body is actually pure?
        // If bodyRes.eff is !Infer, we might assume it fits? No, usually !Infer means "could differ".
        // But here we are strict.
        throw new Error(`Type Error: Lambda declared ${expr.eff} but body is ${bodyRes.eff}`);
    }

    return {
        type: { type: 'Fn', args: argTypes, ret: expr.ret, eff: expr.eff },
        eff: '!Pure' // Creating a lambda is Pure
    };
}
