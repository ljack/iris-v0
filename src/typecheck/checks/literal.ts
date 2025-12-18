
import { Expr, IrisType, IrisEffect } from '../../types';
import { TypeCheckerContext, CheckFn } from '../context';

export function checkLiteral(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    if (expr.kind !== 'Literal') throw new Error("Internal: checkLiteral called on non-Literal");
    const val = expr.value;
    if (val.kind === 'I64') return { type: { type: 'I64' }, eff: '!Pure' };
    if (val.kind === 'Bool') return { type: { type: 'Bool' }, eff: '!Pure' };
    if (val.kind === 'Str') return { type: { type: 'Str' }, eff: '!Pure' };
    if (val.kind === 'Option') {
        if (val.value === null) return { type: { type: 'Option', inner: { type: 'I64' } }, eff: '!Pure' }; // Default None type
        const inner = check(ctx, { kind: 'Literal', value: val.value } as Expr, env);
        return { type: { type: 'Option', inner: inner.type }, eff: inner.eff };
    }
    if (val.kind === 'Result') {
        const v = check(ctx, { kind: 'Literal', value: val.value } as Expr, env);
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
