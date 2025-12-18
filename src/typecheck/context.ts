
import { Program, IrisType, IrisEffect, ModuleResolver, Expr } from '../types';

export interface TypeCheckerContext {
    functions: Map<string, { args: IrisType[], ret: IrisType, eff: IrisEffect }>;
    constants: Map<string, IrisType>;
    types: Map<string, IrisType>;
    currentProgram?: Program;
    resolver?: ModuleResolver;
}

export type CheckFn = (ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType) => { type: IrisType, eff: IrisEffect };
