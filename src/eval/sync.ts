import { Expr, Value, LinkedEnv, IntrinsicOp } from "../types";
import { IInterpreter } from "./interfaces";
import { valueToKey, keyToValue } from "./utils";
import { evalMath } from "./ops/math";
import { evalIo } from "./ops/io";
import { evalHttp } from "./ops/http";
import { evalConstructor } from "./ops/constructors";

const MAX_RECURSION_DEPTH = 10000;
let globalRecursionDepth = 0;

export function evalExprSync(
  ctx: IInterpreter,
  expr: Expr,
  env?: LinkedEnv,
): Value {
  globalRecursionDepth++;
  if (globalRecursionDepth > MAX_RECURSION_DEPTH) {
    globalRecursionDepth--;
    throw new Error(
      `Runtime: Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded. This may indicate infinite recursion in your IRIS code.`,
    );
  }

  try {
    return evalExprSyncInternal(ctx, expr, env);
  } finally {
    globalRecursionDepth--;
  }
}

function evalExprSyncInternal(
  ctx: IInterpreter,
  expr: Expr,
  env?: LinkedEnv,
): Value {
  let currentExpr = expr;
  let currentEnv = env;

  while (true) {
    switch (currentExpr.kind) {
      case "Literal":
        return currentExpr.value;

      case "Var": {
        let current = currentEnv;
        while (current) {
          if (current.name === currentExpr.name) return current.value;
          current = current.parent;
        }

        const c = ctx.constants.get(currentExpr.name);
        if (c !== undefined) return c;

        if (currentExpr.name.includes(".")) {
          const parts = currentExpr.name.split(".");
          let currentVal: Value | undefined = undefined;

          let e = currentEnv;
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
              if (currentVal!.kind === "Record") {
                const fieldVal: Value = (currentVal as any).fields[part];
                if (!fieldVal)
                  throw new Error(`Runtime: Unknown field ${part} `);
                currentVal = fieldVal;
              } else if (currentVal!.kind === "Tuple") {
                const index = parseInt(part);
                if (isNaN(index))
                  throw new Error(
                    `Runtime: Tuple index must be number, got ${part} `,
                  );
                if (index < 0 || index >= (currentVal as any).items.length)
                  throw new Error(
                    `Runtime: Tuple index out of bounds ${index} `,
                  );
                currentVal = (currentVal as any).items[index];
              } else {
                throw new Error(
                  `Runtime: Cannot access field ${part} of ${currentVal!.kind} `,
                );
              }
            }
            return currentVal!;
          }
        }

        throw new Error(`Runtime Unknown variable: ${currentExpr.name} `);
      }

      case "Let": {
        const val = evalExprSync(ctx, currentExpr.value, currentEnv);
        const newEnv: LinkedEnv = {
          name: currentExpr.name,
          value: val,
          parent: currentEnv,
        };
        currentExpr = currentExpr.body;
        currentEnv = newEnv;
        continue;
      }

      case "Do": {
        const exprs = currentExpr.exprs;
        for (let i = 0; i < exprs.length - 1; i++) {
          evalExprSync(ctx, exprs[i], currentEnv);
        }
        currentExpr = exprs[exprs.length - 1];
        continue;
      }

      case "If": {
        const cond = evalExprSync(ctx, currentExpr.cond, currentEnv);
        if (cond.kind !== "Bool") throw new Error("If condition must be Bool");
        if (cond.value) {
          currentExpr = currentExpr.then;
        } else {
          currentExpr = currentExpr.else;
        }
        continue;
      }

      case "Call": {
        let func = ctx.functions.get(currentExpr.fn);

        if (!func && currentExpr.fn.includes(".")) {
          const [alias, fname] = currentExpr.fn.split(".");
          const importDecl = ctx.program.imports.find((i) => i.alias === alias);
          if (importDecl && ctx.resolver) {
            const importedProg = ctx.resolver(importDecl.path);
            if (importedProg) {
              const targetDef = importedProg.defs.find(
                (d) =>
                  (d.kind === "DefFn" || d.kind === "DefTool") &&
                  d.name === fname,
              ) as any;
              if (targetDef) {
                func = targetDef;
              }
            }
          }
        }

        const args: Value[] = [];
        for (const arg of currentExpr.args) {
          args.push(evalExprSync(ctx, arg, currentEnv));
        }

        if (currentExpr.fn.includes(".")) {
          const [alias, fname] = currentExpr.fn.split(".");
          const importDecl = ctx.program.imports.find((i) => i.alias === alias);
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
              // Sync call in subInterpreter needs to be exposed on IInterpreter
              // But IInterpreter only has callFunction (async).
              // Ops... IInterpreter needs callFunctionSync ?
              // The original Interpreter has callFunctionSync.
              // I should add callFunctionSync to IInterpreter.
              return (subInterp as any).callFunctionSync(fname, args);
            }
          }
        }

        if (!func) {
          return evalIntrinsicSync(ctx, currentExpr.fn as any, args);
        }

        if (func.kind === "DefTool") {
          if (!(ctx as any).tools?.callToolSync)
            throw new Error(`Tool not implemented: ${currentExpr.fn}`);
          return (ctx as any).tools.callToolSync(currentExpr.fn, args);
        }
        if (args.length !== func.args.length)
          throw new Error(
            `Arity mismatch error call ${currentExpr.fn} expected ${func.args.length} args, got ${args.length} `,
          );

        let newEnv: LinkedEnv | undefined = undefined;
        for (let i = 0; i < args.length; i++) {
          newEnv = { name: func.args[i].name, value: args[i], parent: newEnv };
        }

        currentExpr = func.body;
        currentEnv = newEnv;
        continue;
      }

      case "Match": {
        const target = evalExprSync(ctx, currentExpr.target, currentEnv);
        let foundCase = false;
        for (const c of currentExpr.cases) {
          let match = false;
          let newEnv = currentEnv;

          if (target.kind === "Option") {
            if (c.tag === "None" && target.value === null) match = true;
            else if (c.tag === "Some" && target.value !== null) {
              match = true;
              if (c.vars.kind === "List" && c.vars.items.length > 0) {
                const varVal = c.vars.items[0];
                if (varVal.kind === "Str")
                  newEnv = {
                    name: varVal.value,
                    value: target.value,
                    parent: newEnv,
                  };
              }
            }
          } else if (target.kind === "Result") {
            if (c.tag === "Ok" && target.isOk) {
              match = true;
              if (c.vars.kind === "List" && c.vars.items.length > 0) {
                const varVal = c.vars.items[0];
                if (varVal.kind === "Str")
                  newEnv = {
                    name: varVal.value,
                    value: target.value,
                    parent: newEnv,
                  };
              }
            } else if (c.tag === "Err" && !target.isOk) {
              match = true;
              if (c.vars.kind === "List" && c.vars.items.length > 0) {
                const varVal = c.vars.items[0];
                if (varVal.kind === "Str")
                  newEnv = {
                    name: varVal.value,
                    value: target.value,
                    parent: newEnv,
                  };
              }
            }
          } else if (target.kind === "Tagged") {
            if (c.tag === target.tag) {
              match = true;
              if (
                target.value &&
                c.vars.kind === "List" &&
                c.vars.items.length > 0
              ) {
                const varNameVal = c.vars.items[0];
                if (varNameVal.kind === "Str") {
                  newEnv = {
                    name: varNameVal.value,
                    value: target.value,
                    parent: newEnv,
                  };
                }
              }
            }
          } else if (target.kind === "List") {
            if (c.tag === "nil" && target.items.length === 0) {
              match = true;
            } else if (c.tag === "cons" && target.items.length > 0) {
              match = true;
              if (c.vars.kind === "List") {
                if (c.vars.items.length >= 1) {
                  const headName = c.vars.items[0];
                  if (headName.kind === "Str")
                    newEnv = {
                      name: headName.value,
                      value: target.items[0],
                      parent: newEnv,
                    };
                }
                if (c.vars.items.length >= 2) {
                  const tailName = c.vars.items[1];
                  if (tailName.kind === "Str")
                    newEnv = {
                      name: tailName.value,
                      value: { kind: "List", items: target.items.slice(1) },
                      parent: newEnv,
                    };
                }
              }
            }
          } else if (
            target.kind === "Tuple" &&
            target.items.length > 0 &&
            target.items[0].kind === "Str"
          ) {
            const tagName = target.items[0].value;
            if (c.tag === tagName) {
              match = true;
              if (c.vars.kind === "List") {
                for (let i = 0; i < c.vars.items.length; i++) {
                  if (i + 1 < target.items.length) {
                    const varVal = c.vars.items[i];
                    if (varVal.kind === "Str")
                      newEnv = {
                        name: varVal.value,
                        value: target.items[i + 1],
                        parent: newEnv,
                      };
                  }
                }
              }
            }
          }

          if (match || c.tag === "_") {
            currentExpr = c.body;
            currentEnv = newEnv;
            foundCase = true;
            break;
          }
        }
        if (foundCase) continue;
        const replacer = (_: string, v: any) =>
          typeof v === "bigint" ? v.toString() + "n" : v;
        throw new Error(
          `Non - exhaustive match for ${JSON.stringify(target, replacer)}`,
        );
      }

      case "Record": {
        const fields: Record<string, Value> = {};
        for (const fieldTuple of currentExpr.fields) {
          const tupleVal = evalExprSync(ctx, fieldTuple, currentEnv);
          if (tupleVal.kind !== "Tuple" || tupleVal.items.length !== 2)
            throw new Error("Invalid record field tuple");
          const keyVal = tupleVal.items[0];
          if (keyVal.kind !== "Str") throw new Error("Record key must be Str");
          fields[keyVal.value] = tupleVal.items[1];
        }
        return { kind: "Record", fields };
      }

      case "Tuple": {
        const items: Value[] = [];
        for (const item of currentExpr.items) {
          items.push(evalExprSync(ctx, item, currentEnv));
        }
        return { kind: "Tuple", items };
      }

      case "List": {
        const items: Value[] = [];
        for (const item of currentExpr.items) {
          items.push(evalExprSync(ctx, item, currentEnv));
        }
        return { kind: "List", items };
      }

      case "Intrinsic": {
        const args: Value[] = [];
        for (const arg of currentExpr.args) {
          args.push(evalExprSync(ctx, arg, currentEnv));
        }
        return evalIntrinsicSync(ctx, currentExpr.op, args);
      }

      case "Tagged": {
        const val = evalExprSync(ctx, currentExpr.value, currentEnv);
        return { kind: "Tagged", tag: currentExpr.tag, value: val };
      }

      case "Lambda": {
        return {
          kind: "Lambda",
          args: currentExpr.args,
          ret: currentExpr.ret,
          eff: currentExpr.eff,
          body: currentExpr.body,
          env: currentEnv,
        };
      }

      default:
        throw new Error(
          `Unimplemented evalSync for ${(currentExpr as any).kind}`,
        );
    }
  }
}

function evalIntrinsicSync(
  ctx: IInterpreter,
  op: IntrinsicOp,
  args: Value[],
): Value {
  if (["Some", "Ok", "Err"].includes(op)) return evalConstructor(op, args);
  if (op.startsWith("http.")) return evalHttp(op, args);
  if (op.startsWith("io.")) return evalIo(ctx, op, args);

  // Math/Pure
  try {
    return evalMath(op, args);
  } catch (e) {
    // If evalMath didn't match, maybe map/list ops?
  }

  if (op.startsWith("map.")) {
    if (op === "map.make") return { kind: "Map", value: new Map() };
    if (op === "map.put") {
      const m = args[0] as any;
      const k = args[1];
      const v = args[2];
      const newMap = new Map<string, Value>(m.value);
      newMap.set(valueToKey(k), v);
      return { kind: "Map", value: newMap };
    }
    if (op === "map.get") {
      const m = args[0] as any;
      const k = args[1];
      const v = m.value.get(valueToKey(k));
      return v ? { kind: "Option", value: v } : { kind: "Option", value: null };
    }
    if (op === "map.contains")
      return {
        kind: "Bool",
        value: (args[0] as any).value.has(valueToKey(args[1])),
      };
    if (op === "map.keys") {
      const m = args[0] as any;
      const keys = Array.from((m.value as Map<string, Value>).keys()).map(
        (k: string) => keyToValue(k),
      );
      return { kind: "List", items: keys };
    }
  }

  if (op === "cons")
    return { kind: "List", items: [args[0], ...(args[1] as any).items] };
  if (op.startsWith("list.")) {
    if (op === "list.length")
      return { kind: "I64", value: BigInt((args[0] as any).items.length) };
    if (op === "list.get") {
      const l = (args[0] as any).items;
      const i = Number((args[1] as any).value);
      if (i >= 0 && i < l.length) return { kind: "Option", value: l[i] };
      return { kind: "Option", value: null };
    }
    if (op === "list.concat")
      return {
        kind: "List",
        items: [...(args[0] as any).items, ...(args[1] as any).items],
      };
    if (op === "list.unique") {
      const l = args[0] as any;
      const seen = new Set<string>();
      const items: Value[] = [];
      for (const item of l.items) {
        const k = valueToKey(item);
        if (!seen.has(k)) {
          seen.add(k);
          items.push(item);
        }
      }
      return { kind: "List", items };
    }
  }

  if (op === "record.set") {
    const r = args[0];
    const f = args[1];
    const v = args[2];
    if (r.kind !== "Record" || f.kind !== "Str")
      throw new Error("record.set expects Record and Str");
    return { kind: "Record", fields: { ...r.fields, [f.value]: v } };
  }

  if (op === "record.get") {
    const r = args[0];
    const f = args[1];
    if (r.kind !== "Record" || f.kind !== "Str")
      throw new Error("record.get expects Record and Str");
    const val = r.fields[f.value];
    if (val === undefined) throw new Error(`Field ${f.value} not found`);
    return val;
  }

  if (op === "tuple.get") {
    const t = args[0];
    const i = args[1];
    if (t.kind !== "Tuple" || i.kind !== "I64")
      throw new Error("tuple.get expects Tuple and I64");
    const idx = Number(i.value);
    if (idx < 0 || idx >= t.items.length)
      throw new Error("Tuple index out of bounds");
    return t.items[idx];
  }

  if (op === "str.concat")
    return {
      kind: "Str",
      value: ((args[0] as any)?.value || "") + ((args[1] as any)?.value || ""),
    };
  if (op === "str.len")
    return {
      kind: "I64",
      value: BigInt(((args[0] as any)?.value || "").length),
    };
  if (op === "str.get") {
    const s = (args[0] as any).value;
    const i = Number((args[1] as any).value);
    if (i >= 0 && i < s.length)
      return {
        kind: "Option",
        value: { kind: "I64", value: BigInt(s.charCodeAt(i)) },
      };
    return { kind: "Option", value: null };
  }
  if (op === "str.substring")
    return {
      kind: "Str",
      value: (args[0] as any).value.substring(
        Number((args[1] as any).value),
        Number((args[2] as any).value),
      ),
    };
  if (op === "str.from_code")
    return {
      kind: "Str",
      value: String.fromCharCode(Number((args[0] as any).value)),
    };
  if (op === "str.index_of") {
    const s = (args[0] as any).value;
    const sub = (args[1] as any).value;
    const idx = s.indexOf(sub);
    if (idx === -1) return { kind: "Option", value: null };
    return { kind: "Option", value: { kind: "I64", value: BigInt(idx) } };
  }
  if (op === "str.contains")
    return {
      kind: "Bool",
      value: (args[0] as any).value.includes((args[1] as any).value),
    };
  if (op === "str.ends_with")
    return {
      kind: "Bool",
      value: (args[0] as any).value.endsWith((args[1] as any).value),
    };

  if (op.startsWith("net.") || op === "sys.sleep") {
    throw new Error(
      `Cannot call async intrinsic ${op} from synchronous evaluation path`,
    );
  }

  if (op === "sys.args") {
    const argsList = ctx.args.map((a) => ({ kind: "Str", value: a }) as Value);
    return { kind: "List", items: argsList };
  }

  throw new Error(`Unknown intrinsic or not implemented in Sync path: ${op} `);
}
