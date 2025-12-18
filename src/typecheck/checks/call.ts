
import { Expr, IrisType, IrisEffect } from '../../types';
import { TypeCheckerContext, CheckFn } from '../context';
import { resolve, joinEffects, expectType, qualifyType } from '../utils';

export function checkCall(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    if (expr.kind === 'Var') {
        if (env.has(expr.name)) return { type: env.get(expr.name)!, eff: '!Pure' };
        if (ctx.constants.has(expr.name)) return { type: ctx.constants.get(expr.name)!, eff: '!Pure' };

        // Dot access for records
        if (expr.name.includes('.')) {
            const parts = expr.name.split('.');
            let currentType = env.get(parts[0]) || ctx.constants.get(parts[0]);
            if (currentType) {
                for (let i = 1; i < parts.length; i++) {
                    currentType = resolve(ctx, currentType!);
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

    if (expr.kind === 'Call') {
        let func = ctx.functions.get(expr.fn);

        if (!func && expr.fn.includes('.')) {
            // Try to resolve imported function
            const [alias, fname] = expr.fn.split('.');
            const importDecl = ctx.currentProgram?.imports.find(i => i.alias === alias);
            if (importDecl && ctx.resolver) {
                const importedProg = ctx.resolver(importDecl.path);
                if (importedProg) {
                    const targetDef = importedProg.defs.find(d => d.kind === 'DefFn' && d.name === fname) as any;
                    if (targetDef) {
                        const exportedTypes = new Set(importedProg.defs.filter((d: any) => d.kind === 'TypeDef').map((d: any) => d.name));
                        func = {
                            args: targetDef.args.map((a: any) => qualifyType(ctx, a.type, alias, exportedTypes)),
                            ret: qualifyType(ctx, targetDef.ret, alias, exportedTypes),
                            eff: targetDef.eff
                        };
                    }
                }
            }
        }

        if (!func) throw new Error(`TypeError: Unknown function call: ${expr.fn}`);
        if (expr.args.length !== func.args.length) throw new Error(`TypeError: Arity mismatch for ${expr.fn}`);
        let eff: IrisEffect = '!Pure';
        for (let i = 0; i < expr.args.length; i++) {
            const arg = check(ctx, expr.args[i], env, func.args[i]);
            expectType(ctx, func.args[i], arg.type, `Argument ${i} mismatch`);
            eff = joinEffects(eff, arg.eff);
        }
        // Handle !Infer: if callee is !Infer, treat as !Any (pessimistic) unless we know better.
        const callEff = func.eff === '!Infer' ? '!Any' : func.eff;
        return { type: func.ret, eff: joinEffects(eff, callEff) };
    }

    throw new Error(`Internal: checkCall called on non-callable expr ${expr.kind}`);
}
