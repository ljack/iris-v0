
import { Expr, Value, LinkedEnv, IntrinsicOp } from '../types';
import { IInterpreter } from './interfaces';
import { evalIntrinsic } from './ops/index';

export async function evalExpr(ctx: IInterpreter, expr: Expr, env?: LinkedEnv): Promise<Value> {
    switch (expr.kind) {
        case 'Literal':
            return expr.value;

        case 'Var': {
            // Resolve Env
            let current = env;
            while (current) {
                if (current.name === expr.name) return current.value;
                current = current.parent;
            }

            const c = ctx.constants.get(expr.name);
            if (c !== undefined) return c;

            if (expr.name.includes('.')) {
                const parts = expr.name.split('.');
                let currentVal: Value | undefined = undefined;

                // Try env first
                let e = env;
                while (e) {
                    if (e.name === parts[0]) {
                        currentVal = e.value;
                        break;
                    }
                    e = e.parent;
                }

                if (!currentVal) currentVal = ctx.constants.get(parts[0]);

                if (currentVal) {
                    for (let i = 1; i < parts.length; i++) {
                        const part = parts[i];
                        if (currentVal!.kind === 'Record') {
                            const fieldVal: Value = (currentVal as any).fields[part];
                            if (!fieldVal) throw new Error(`Runtime: Unknown field ${part} `);
                            currentVal = fieldVal;
                        } else if (currentVal!.kind === 'Tuple') {
                            const index = parseInt(part);
                            if (isNaN(index)) throw new Error(`Runtime: Tuple index must be number, got ${part} `);
                            if (index < 0 || index >= (currentVal as any).items.length) throw new Error(`Runtime: Tuple index out of bounds ${index} `);
                            currentVal = (currentVal as any).items[index];
                        } else {
                            throw new Error(`Runtime: Cannot access field ${part} of ${currentVal!.kind} `);
                        }
                    }
                    return currentVal!;
                }
            }

            throw new Error(`Runtime Unknown variable: ${expr.name} `);
        }

        case 'Let': {
            const val = await evalExpr(ctx, expr.value, env);
            const newEnv: LinkedEnv = { name: expr.name, value: val, parent: env };
            return evalExpr(ctx, expr.body, newEnv);
        }

        case 'Do': {
            let result: Value = { kind: 'Bool', value: false };
            for (let i = 0; i < expr.exprs.length; i++) {
                result = await evalExpr(ctx, expr.exprs[i], env);
            }
            return result;
        }

        case 'If': {
            const cond = await evalExpr(ctx, expr.cond, env);
            if (cond.kind !== 'Bool') throw new Error("If condition must be Bool");
            if (cond.value) {
                return evalExpr(ctx, expr.then, env);
            } else {
                return evalExpr(ctx, expr.else, env);
            }
        }

        case 'Call': {
            let func = ctx.functions.get(expr.fn);

            if (!func && expr.fn.includes('.')) {
                const [alias, fname] = expr.fn.split('.');
                const importDecl = ctx.program.imports.find(i => i.alias === alias);
                if (importDecl && ctx.resolver) {
                    const importedProg = ctx.resolver(importDecl.path);
                    if (importedProg) {
                        const targetDef = importedProg.defs.find(d => (d.kind === 'DefFn' || d.kind === 'DefTool') && d.name === fname) as any;
                        if (targetDef) {
                            func = targetDef;
                        }
                    }
                }
            }


            // Evaluate args in current scope
            const args: Value[] = [];
            for (const arg of expr.args) {
                args.push(await evalExpr(ctx, arg, env));
            }

            if (expr.fn.includes('.')) {
                // It's a cross-module call.
                const [alias, fname] = expr.fn.split('.');
                const importDecl = ctx.program.imports.find(i => i.alias === alias);
                if (importDecl && ctx.resolver) {
                    const importedPath = importDecl.path;
                    let subInterp = ctx.getInterpreter(importedPath);
                    if (!subInterp) {
                        const importedProg = ctx.resolver(importedPath);
                        if (importedProg) {
                            subInterp = ctx.createInterpreter(importedProg);
                        }
                    }
                    if (subInterp) {
                        return subInterp.callFunction(fname, args);
                    }
                }
            }

            if (!func) {
                try {
                    // Adapt InterpreterContext to logic required by helpers?
                    // We need to cast or ensure IInterpreter satisfies InterpreterContext from ops/sys.ts?
                    // ops/sys.ts takes InterpreterContext which has spawn, pid, etc.
                    // IInterpreter has spawn, pid, etc.
                    return await evalIntrinsic(ctx as any, expr.fn as IntrinsicOp, args);
                } catch (e) {
                    throw new Error(`Unknown function: ${expr.fn}`);
                }
            }

            if (func.kind === 'DefTool') {
                if (!ctx.tools) throw new Error(`Tool not implemented: ${expr.fn}`);
                return ctx.tools.callTool(expr.fn, args);
            }
            if (args.length !== func.args.length) throw new Error(`Arity mismatch for ${expr.fn}`);

            // Create new env for function body
            let newEnv: LinkedEnv | undefined = undefined;
            for (let i = 0; i < args.length; i++) {
                newEnv = { name: func.args[i].name, value: args[i], parent: newEnv };
            }

            return evalExpr(ctx, func.body, newEnv);
        }

        case 'Match': {
            const target = await evalExpr(ctx, expr.target, env);

            // Find matching case
            for (const c of expr.cases) {
                // Check tag match
                let match = false;
                let newEnv = env;

                if (target.kind === 'Option') {
                    if (c.tag === 'None' && target.value === null) match = true;
                    else if (c.tag === 'Some' && target.value !== null) {
                        match = true;
                        if (c.vars.kind === 'List' && c.vars.items.length > 0) {
                            const varVal = c.vars.items[0];
                            if (varVal.kind === 'Str') newEnv = { name: varVal.value, value: target.value, parent: newEnv };
                        }
                    }
                } else if (target.kind === 'Result') {
                    if (c.tag === 'Ok' && target.isOk) {
                        match = true;
                        if (c.vars.kind === 'List' && c.vars.items.length > 0) {
                            const varVal = c.vars.items[0];
                            if (varVal.kind === 'Str') newEnv = { name: varVal.value, value: target.value, parent: newEnv };
                        }
                    } else if (c.tag === 'Err' && !target.isOk) {
                        match = true;
                        if (c.vars.kind === 'List' && c.vars.items.length > 0) {
                            const varVal = c.vars.items[0];
                            if (varVal.kind === 'Str') newEnv = { name: varVal.value, value: target.value, parent: newEnv };
                        }
                    }
                } else if (target.kind === 'List') {
                    if (c.tag === 'nil' && target.items.length === 0) {
                        match = true;
                    } else if (c.tag === 'cons' && target.items.length > 0) {
                        match = true;
                        if (c.vars.kind === 'List') {
                            if (c.vars.items.length >= 1) {
                                const headName = c.vars.items[0];
                                if (headName.kind === 'Str') newEnv = { name: headName.value, value: target.items[0], parent: newEnv };
                            }
                            if (c.vars.items.length >= 2) {
                                const tailName = c.vars.items[1];
                                if (tailName.kind === 'Str') newEnv = { name: tailName.value, value: { kind: 'List', items: target.items.slice(1) }, parent: newEnv };
                            }
                        }
                    }
                } else if (target.kind === 'Tagged') {
                    if (c.tag === target.tag) {
                        match = true;
                        if (target.value && c.vars.kind === 'List' && c.vars.items.length > 0) {
                            const varNameVal = c.vars.items[0];
                            if (varNameVal.kind === 'Str') {
                                newEnv = { name: varNameVal.value, value: target.value, parent: newEnv };
                            }
                        }
                    }
                } else if (target.kind === 'Tuple' && target.items.length > 0 && target.items[0].kind === 'Str') {
                    // Generic Tagged Union (represented as Tuple ["Tag", ...args])
                    const tagName = target.items[0].value;
                    if (c.tag === tagName) {
                        match = true;
                        // Bind variables to remaining tuple items
                        if (c.vars.kind === 'List') {
                            for (let i = 0; i < c.vars.items.length; i++) {
                                if (i + 1 < target.items.length) {
                                    const varVal = c.vars.items[i];
                                    if (varVal.kind === 'Str') {
                                        newEnv = { name: varVal.value, value: target.items[i + 1], parent: newEnv };
                                    }
                                }
                            }
                        }
                    }
                }

                if (match || c.tag === '_') {
                    return evalExpr(ctx, c.body, newEnv);
                }
            }
            const replacer = (_: string, v: any) => typeof v === 'bigint' ? v.toString() + 'n' : v;
            throw new Error(`No matching case for value ${JSON.stringify(target, replacer)}`);
        }

        case 'Record': {
            const fields: Record<string, Value> = {};
            for (const fieldTuple of expr.fields) {
                const tupleVal = await evalExpr(ctx, fieldTuple, env);
                if (tupleVal.kind !== 'Tuple' || tupleVal.items.length !== 2) throw new Error("Invalid record field tuple");
                const keyVal = tupleVal.items[0];
                if (keyVal.kind !== 'Str') throw new Error("Record key must be Str");
                fields[keyVal.value] = tupleVal.items[1];
            }
            return { kind: 'Record', fields };
        }

        case 'Tagged': {
            const val = await evalExpr(ctx, expr.value, env);
            return { kind: 'Tagged', tag: expr.tag, value: val };
        }

        case 'Tuple': {
            const items: Value[] = [];
            for (const item of expr.items) {
                items.push(await evalExpr(ctx, item, env));
            }
            return { kind: 'Tuple', items };
        }

        case 'List': {
            const items: Value[] = [];
            for (const item of expr.items) {
                items.push(await evalExpr(ctx, item, env));
            }
            return { kind: 'List', items };
        }

        case 'Intrinsic': {
            const args: Value[] = [];
            for (const arg of expr.args) {
                args.push(await evalExpr(ctx, arg, env));
            }
            return evalIntrinsic(ctx as any, expr.op, args);
        }

        default:
            throw new Error(`Unimplemented eval for ${(expr as any).kind}`);
    }
}
