
import { Expr, IrisType, IrisEffect } from '../types';
import { TypeCheckerContext } from './context';
import { checkLiteral, checkControl, checkData, checkCall, checkIntrinsic } from './checks';

export function checkExprFull(ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    switch (expr.kind) {
        case 'Literal': return checkLiteral(checkExprFull, ctx, expr, env, expectedType);

        case 'Var':
        case 'Call':
            return checkCall(checkExprFull, ctx, expr, env, expectedType);

        case 'Let':
        case 'If':
        case 'Match':
            return checkControl(checkExprFull, ctx, expr, env, expectedType);

        case 'Record':
        case 'Tagged':
        case 'Tuple':
        case 'List':
            return checkData(checkExprFull, ctx, expr, env, expectedType);

        case 'Intrinsic': return checkIntrinsic(checkExprFull, ctx, expr, env, expectedType);

        default:
            throw new Error(`Unimplemented check for ${(expr as any).kind}`);
    }
}
