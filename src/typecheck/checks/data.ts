
import { Expr, IrisType, IrisEffect } from '../../types';
import { TypeCheckerContext, CheckFn } from '../context';
import { resolve, joinEffects, expectType, fmt } from '../utils';

export function checkData(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    if (expr.kind === 'Record') {
        const fields: Record<string, IrisType> = {};
        let eff: IrisEffect = '!Pure';

        let expectedFields: Record<string, IrisType> | undefined;
        if (expectedType) {
            const resolved = resolve(ctx, expectedType);
            if (resolved.type === 'Record') {
                expectedFields = resolved.fields;
            }
        }

        // expr.fields is Expr[] (List of Tuples: (key, value))
        if (!Array.isArray(expr.fields)) {
            throw new Error("Compiler Error: Record fields must be an array of Tuples");
        }

        for (const fieldExpr of expr.fields) {
            if (fieldExpr.kind !== 'Tuple' || fieldExpr.items.length !== 2) {
                throw new Error("TypeError: Record field must be a Tuple (key, value)");
            }
            const keyExpr = fieldExpr.items[0];
            const valExpr = fieldExpr.items[1];

            // Key must be a string literal for static type checking
            if (keyExpr.kind !== 'Literal' || keyExpr.value.kind !== 'Str') {
                throw new Error("TypeError: Record keys must be string literals provided directly");
            }
            const key = keyExpr.value.value;

            const expectedFieldType = expectedFields ? expectedFields[key] : undefined;
            const res = check(ctx, valExpr, env, expectedFieldType);

            fields[key] = res.type;
            eff = joinEffects(eff, res.eff);
        }
        return { type: { type: 'Record', fields }, eff };
    }

    if (expr.kind === 'Tagged') {
        // (tag "Name" (val))
        let expectHint: IrisType | undefined;
        let resolvedExpect: IrisType | undefined;

        if (expectedType) {
            resolvedExpect = resolve(ctx, expectedType);
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

        const valRes = check(ctx, expr.value, env, expectHint);

        if (resolvedExpect) {
            if (resolvedExpect.type === 'Union') {
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

    if (expr.kind === 'Tuple') {
        const items: IrisType[] = [];
        let eff: IrisEffect = '!Pure';

        let expectedItems: IrisType[] | undefined;
        if (expectedType) {
            const resolved = resolve(ctx, expectedType);
            if (resolved.type === 'Tuple') {
                expectedItems = resolved.items;
            }
        }

        for (let i = 0; i < expr.items.length; i++) {
            const item = expr.items[i];
            const expect = expectedItems ? expectedItems[i] : undefined;
            const res = check(ctx, item, env, expect);
            items.push(res.type);
            eff = joinEffects(eff, res.eff);
        }

        const retType: IrisType = { type: 'Tuple', items };
        if (expectedType && fmt(ctx, expectedType).includes("List Str")) {
            // console.log("TUPLE returning:", fmt(ctx, retType));
        }
        return { type: retType, eff };
    }

    if (expr.kind === 'List') {
        const items: IrisType[] = [];
        let eff: IrisEffect = '!Pure';

        let expectedInner: IrisType | undefined;
        if (expectedType) {
            const resolved = resolve(ctx, expectedType);
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
            const res = check(ctx, item, env, innerType);
            if (!innerType) innerType = res.type;
            else expectType(ctx, innerType, res.type, "List item type mismatch");
            eff = joinEffects(eff, res.eff);
        }

        return { type: { type: 'List', inner: innerType! }, eff };
    }

    throw new Error(`Internal: checkData called on non-data expr ${expr.kind}`);
}
