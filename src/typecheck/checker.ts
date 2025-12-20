
import { Program, IrisType, IrisEffect, ModuleResolver } from '../types';
import { TypeCheckerContext } from './context';
import { checkExprFull } from './check-expr';
import { qualifyType, checkEffectSubtype, expectType } from './utils';

export class TypeChecker implements TypeCheckerContext {
    public functions = new Map<string, { args: IrisType[], ret: IrisType, eff: IrisEffect }>();
    public constants = new Map<string, IrisType>();
    public types = new Map<string, IrisType>();
    public currentProgram?: Program;

    constructor(public resolver?: ModuleResolver) { }

    check(program: Program) {
        this.currentProgram = program;
        const spanSuffix = (span?: { line: number; col: number }) => span ? ` at ${span.line}:${span.col}` : '';

        // Pre-pass: load imported types
        if (this.resolver) {
            for (const imp of program.imports) {
                const mod = this.resolver(imp.path);
                if (mod) {
                    const exportedTypes = new Set(mod.defs.filter(d => d.kind === 'TypeDef').map(d => d.name));
                    for (const def of mod.defs) {
                        if (def.kind === 'TypeDef') {
                            const qualified = qualifyType(this, def.type, imp.alias, exportedTypes);
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
            } else if (def.kind === 'DefFn' || def.kind === 'DefTool') {
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
                const { type, eff } = checkExprFull(this, def.value, new Map());
                expectType(this, def.type, type, `Constant ${def.name} type mismatch${spanSuffix(def.nameSpan)}`);
                checkEffectSubtype(this, eff, '!Pure', `Constant ${def.name} must be Pure`);
            } else if (def.kind === 'DefFn') {
                const fnType = this.functions.get(def.name)!;
                const env = new Map<string, IrisType>();
                for (let i = 0; i < def.args.length; i++) {
                    env.set(def.args[i].name, def.args[i].type);
                }
                if (def.name === 'type_check') console.log("Checking type_check. Ret:", JSON.stringify(def.ret));

                const { type: bodyType, eff: bodyEff } = checkExprFull(this, def.body, env, def.ret);

                expectType(this, def.ret, bodyType, `Function ${def.name} return type mismatch${spanSuffix(def.nameSpan)}`);

                if (def.eff === '!Infer') {
                    // Update registry with inferred effect logic if we supported two-pass inference or similar.
                    // For now, allow it to pass.
                    // In a real system we'd update this.functions but since we already visited calls,
                    // we might need a fixpoint. For v0.2 simple scope, we just let it accept.
                    this.functions.set(def.name, { ...fnType, eff: bodyEff });
                } else {
                    checkEffectSubtype(this, bodyEff, def.eff, `Function ${def.name}${spanSuffix(def.nameSpan)}`);
                }
            } else if (def.kind === 'DefTool') {
                // No body to check; signature is validated in the first pass.
            } else if (def.kind === 'TypeDef') {
                // Nothing to check for body
            }
        }
    }
}
