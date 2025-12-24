
import { Expr, IrisType, IrisEffect } from '../../types';
import { TypeCheckerContext, CheckFn } from '../context';
import { resolve, joinEffects, expectType } from '../utils';

export function checkIntrinsic(check: CheckFn, ctx: TypeCheckerContext, expr: Expr, env: Map<string, IrisType>, expectedType?: IrisType): { type: IrisType, eff: IrisEffect } {
    if (expr.kind !== 'Intrinsic') throw new Error("Internal: checkIntrinsic called on non-Intrinsic");

    // Pre-check for constructors to pass hints
    let argHints: (IrisType | undefined)[] = [];
    if (expectedType) {
        const resolved = resolve(ctx, expectedType);
        if (expr.op === 'Ok' && resolved.type === 'Result') argHints = [resolved.ok];
        else if (expr.op === 'Err' && resolved.type === 'Result') argHints = [resolved.err];
        else if (expr.op === 'Some' && resolved.type === 'Option') argHints = [resolved.inner];
        else if (expr.op === 'cons' && resolved.type === 'List') argHints = [resolved.inner, resolved];
    }

    const argTypes: IrisType[] = [];
    let joinedEff: IrisEffect = '!Pure';
    for (let i = 0; i < expr.args.length; i++) {
        const arg = expr.args[i];
        const hint = argHints[i];
        const res = check(ctx, arg, env, hint);

        argTypes.push(res.type);
        joinedEff = joinEffects(joinedEff, res.eff);
    }

    // Pure Ops
    if (['+', '-', '*', '/', '%', '<', '<=', '=', '>=', '>'].includes(expr.op)) {
        if (['+', '-', '*', '/', '%'].includes(expr.op)) {
            for (let i = 0; i < argTypes.length; i++) {
                if (argTypes[i].type !== 'I64') {
                    throw new Error(`TypeError: Type Error in ${expr.op} operand ${i + 1}: Expected I64, got ${argTypes[i].type}`);
                }
            }
            if (argTypes.length !== 2) throw new Error(`${expr.op} expects 2 operands`);
            return { type: { type: 'I64' }, eff: joinedEff };
        }
        return { type: ['<=', '<', '=', '>=', '>'].includes(expr.op) ? { type: 'Bool' } : { type: 'I64' }, eff: joinedEff };
    }

    if (['&&', '||'].includes(expr.op)) {
        for (let i = 0; i < argTypes.length; i++) {
            if (argTypes[i].type !== 'Bool') throw new Error(`TypeError: Expected Bool for ${expr.op}`);
        }
        return { type: { type: 'Bool' }, eff: joinedEff };
    }
    if (expr.op === '!') {
        if (argTypes.length !== 1 || argTypes[0].type !== 'Bool') throw new Error("TypeError: ! expects 1 Bool");
        return { type: { type: 'Bool' }, eff: joinedEff };
    }

    if (expr.op === 'Some') return { type: { type: 'Option', inner: argTypes[0] }, eff: joinedEff };

    if (expr.op === 'Ok') {
        let errType: IrisType = { type: 'Str' };
        if (expectedType) {
            const resolved = resolve(ctx, expectedType);
            if (resolved.type === 'Result') errType = resolved.err;
        }
        return { type: { type: 'Result', ok: argTypes[0], err: errType }, eff: joinedEff };
    }
    if (expr.op === 'Err') {
        let okType: IrisType = { type: 'I64' };
        if (expectedType) {
            const resolved = resolve(ctx, expectedType);
            if (resolved.type === 'Result') okType = resolved.ok;
        }
        return { type: { type: 'Result', ok: okType, err: argTypes[0] }, eff: joinedEff };
    }
    if (expr.op === 'cons') return { type: { type: 'List', inner: argTypes[0] }, eff: joinedEff };

    if (expr.op.startsWith('io.')) {
        joinedEff = joinEffects(joinedEff, '!IO');
        if (expr.op === 'io.read_file') return { type: { type: 'Result', ok: { type: 'Str' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'io.write_file') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'io.file_exists') return { type: { type: 'Bool' }, eff: joinedEff };
        if (expr.op === 'io.read_dir') return { type: { type: 'Result', ok: { type: 'List', inner: { type: 'Str' } }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'io.print') return { type: { type: 'I64' }, eff: joinedEff };
    }

    if (expr.op.startsWith('sys.')) {
        joinedEff = joinEffects(joinedEff, '!IO');
        if (expr.op === 'sys.self') {
            if (argTypes.length !== 0) throw new Error("sys.self expects 0 arguments");
            return { type: { type: 'I64' }, eff: joinedEff };
        }
        if (expr.op === 'sys.recv') {
            if (argTypes.length !== 0) throw new Error("sys.recv expects 0 arguments");
            return { type: { type: 'Str' }, eff: joinedEff };
        }
        if (expr.op === 'sys.spawn') {
            if (argTypes.length !== 1) throw new Error("sys.spawn expects 1 argument");
            if (argTypes[0].type !== 'Str') throw new Error("sys.spawn expects Str function name");
            return { type: { type: 'I64' }, eff: joinedEff };
        }
        if (expr.op === 'sys.sleep') {
            if (argTypes.length !== 1) throw new Error("sys.sleep expects 1 argument");
            if (argTypes[0].type !== 'I64') throw new Error("sys.sleep expects I64 ms");
            return { type: { type: 'Bool' }, eff: joinedEff };
        }
        if (expr.op === 'sys.send') {
            if (argTypes.length !== 2) throw new Error("sys.send expects 2 arguments (pid, msg)");
            const [pid, msg] = argTypes;
            if (pid.type !== 'I64') throw new Error("sys.send expects I64 pid");
            if (msg.type !== 'Str') throw new Error("sys.send expects Str msg");
            return { type: { type: 'Bool' }, eff: joinedEff };
        }
        if (expr.op === 'sys.args') {
            if (argTypes.length !== 0) throw new Error("sys.args expects 0 arguments");
            return { type: { type: 'List', inner: { type: 'Str' } }, eff: joinedEff };
        }
    }

    if (expr.op === 'rand.u64') {
        if (argTypes.length !== 0) throw new Error("rand.u64 expects 0 arguments");
        joinedEff = joinEffects(joinedEff, '!IO');
        return { type: { type: 'I64' }, eff: joinedEff };
    }

    if (expr.op.startsWith('net.')) {
        joinedEff = joinEffects(joinedEff, '!Net');
        if (expr.op === 'net.listen') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'net.accept') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'net.read') return { type: { type: 'Result', ok: { type: 'Str' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'net.write') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'net.close') return { type: { type: 'Result', ok: { type: 'Bool' }, err: { type: 'Str' } }, eff: joinedEff };
        if (expr.op === 'net.connect') return { type: { type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, eff: joinedEff };
    }

    if (expr.op.startsWith('str.')) {
        if (expr.op === 'str.len') {
            if (argTypes.length !== 1) throw new Error("str.len expects 1 arg");
            if (argTypes[0].type !== 'Str') throw new Error("str.len expects Str");
            return { type: { type: 'I64' }, eff: joinedEff };
        }
        if (expr.op === 'str.concat') return { type: { type: 'Str' }, eff: joinedEff };
        if (expr.op === 'str.contains' || expr.op === 'str.ends_with') return { type: { type: 'Bool' }, eff: joinedEff };
        if (expr.op === 'str.get') {
            if (argTypes.length !== 2) throw new Error("str.get expects 2 args (str, index)");
            if (argTypes[0].type !== 'Str') throw new Error("str.get expects Str");
            if (argTypes[1].type !== 'I64') throw new Error("str.get expects I64 index");
            return { type: { type: 'Option', inner: { type: 'I64' } }, eff: joinedEff };
        }
        if (expr.op === 'str.substring') {
            if (argTypes.length !== 3) throw new Error("str.substring expects 3 args (str, start, end)");
            if (argTypes[0].type !== 'Str') throw new Error("str.substring expects Str");
            if (argTypes[1].type !== 'I64') throw new Error("str.substring expects I64 start");
            if (argTypes[2].type !== 'I64') throw new Error("str.substring expects I64 end");
            return { type: { type: 'Str' }, eff: joinedEff };
        }
        if (expr.op === 'str.from_code') {
            if (argTypes.length !== 1) throw new Error("str.from_code expects 1 arg (code)");
            if (argTypes[0].type !== 'I64') throw new Error("str.from_code expects I64");
            return { type: { type: 'Str' }, eff: joinedEff };
        }
        if (expr.op === 'str.index_of') {
            if (argTypes.length !== 2) throw new Error("str.index_of expects 2 args (str, substr)");
            if (argTypes[0].type !== 'Str') throw new Error("str.index_of expects Str");
            if (argTypes[1].type !== 'Str') throw new Error("str.index_of expects Str substring");
            return { type: { type: 'Option', inner: { type: 'I64' } }, eff: joinedEff };
        }
    }

    if (expr.op.startsWith('map.')) {
        if (expr.op === 'map.make') {
            if (argTypes.length !== 2) throw new Error("map.make expects 2 arguments (key_witness, value_witness)");

            if (expectedType) {
                const resolved = resolve(ctx, expectedType);
                if (resolved.type === 'Map') return { type: expectedType, eff: joinedEff };
            }

            return { type: { type: 'Map', key: argTypes[0], value: argTypes[1] }, eff: joinedEff };
        }
        if (expr.op === 'map.put') {
            if (argTypes.length !== 3) throw new Error("map.put expects 3 args (map, key, value)");
            const [m, k, v] = argTypes;
            if (m.type !== 'Map') throw new Error("map.put expects Map as first arg");
            expectType(ctx, m.key, k, "map.put key mismatch");
            expectType(ctx, m.value, v, "map.put value mismatch");
            return { type: m, eff: joinedEff };
        }
        if (expr.op === 'map.get') {
            if (argTypes.length !== 2) throw new Error("map.get expects 2 args (map, key)");
            const [m, k] = argTypes;
            if (m.type !== 'Map') throw new Error("map.get expects Map as first arg");
            expectType(ctx, m.key, k, "map.get key mismatch");
            return { type: { type: 'Option', inner: m.value }, eff: joinedEff };
        }
        if (expr.op === 'map.contains') {
            if (argTypes.length !== 2) throw new Error("map.contains expects 2 args (map, key)");
            const [m, k] = argTypes;
            if (m.type !== 'Map') throw new Error("map.contains expects Map as first arg");
            expectType(ctx, m.key, k, "map.contains key mismatch");
            return { type: { type: 'Bool' }, eff: joinedEff };
        }
        if (expr.op === 'map.keys') {
            if (argTypes.length !== 1) throw new Error("map.keys expects 1 arg (map)");
            const m = argTypes[0];
            if (m.type !== 'Map') throw new Error("map.keys expects Map");
            return { type: { type: 'List', inner: m.key }, eff: joinedEff };
        }
    }

    if (expr.op.startsWith('list.')) {
        if (expr.op === 'list.length') {
            if (argTypes.length !== 1) throw new Error("list.length expects 1 arg (list)");
            if (argTypes[0].type !== 'List') throw new Error("list.length expects List");
            return { type: { type: 'I64' }, eff: joinedEff };
        }
        if (expr.op === 'list.get') {
            if (argTypes.length !== 2) throw new Error("list.get expects 2 args (list, index)");
            const [l, idx] = argTypes;
            if (l.type !== 'List') throw new Error("list.get expects List");
            if (idx.type !== 'I64') throw new Error("list.get expects I64 index");
            return { type: { type: 'Option', inner: l.inner }, eff: joinedEff };
        }
        if (expr.op === 'list.concat') {
            if (argTypes.length !== 2) throw new Error("list.concat expects 2 args (list1, list2)");
            const [l1, l2] = argTypes;
            if (l1.type !== 'List' || l2.type !== 'List') throw new Error("list.concat expects two Lists");
            return { type: l1, eff: joinedEff };
        }
        if (expr.op === 'list.unique') {
            if (argTypes.length !== 1) throw new Error("list.unique expects 1 arg (list)");
            return { type: argTypes[0], eff: joinedEff };
        }
    }

    if (expr.op === 'i64.from_string') {
        if (argTypes.length !== 1) throw new Error("i64.from_string expects 1 arg (Str)");
        if (argTypes[0].type !== 'Str') throw new Error("i64.from_string expects Str");
        return { type: { type: 'I64' }, eff: joinedEff };
    }

    if (expr.op === 'i64.to_string') {
        if (argTypes.length !== 1) throw new Error("i64.to_string expects 1 arg (I64)");
        if (argTypes[0].type !== 'I64') throw new Error("i64.to_string expects I64");
        return { type: { type: 'Str' }, eff: joinedEff };
    }

    if (expr.op === 'tuple.get') {
        if (argTypes.length !== 2) throw new Error("tuple.get expects 2 args (tuple, index)");
        const [tRaw, idx] = argTypes;
        const t = resolve(ctx, tRaw);
        if (t.type !== 'Tuple') throw new Error("tuple.get expects Tuple");
        if (idx.type !== 'I64') throw new Error("tuple.get expects I64 index");
        if (expr.args[1].kind === 'Literal' && expr.args[1].value.kind === 'I64') {
            const i = Number(expr.args[1].value.value);
            if (i < 0 || i >= t.items.length) throw new Error(`Tuple index out of bounds: ${i}`);
            return { type: t.items[i], eff: joinedEff };
        }
        throw new Error("tuple.get requires literal index for type safety");
    }

    if (expr.op === 'record.set') {
        if (argTypes.length !== 3) throw new Error("record.set expects 3 args (record, key, value)");
        const [recRaw, k, v] = argTypes;
        const rec = resolve(ctx, recRaw);
        if (rec.type !== 'Record') throw new Error("record.set expects Record");
        if (k.type !== 'Str') throw new Error("record.set expects Str key");

        if (expr.args[1].kind === 'Literal' && expr.args[1].value.kind === 'Str') {
            const keyVal = expr.args[1].value.value;
            const fieldType = rec.fields[keyVal];
            if (!fieldType) throw new Error(`Unknown field ${keyVal} in record`);
            expectType(ctx, fieldType, v, `record.set value mismatch for '${keyVal}'`);
            return { type: rec, eff: joinedEff };
        }
        throw new Error("record.set requires literal string key");
    }

    if (expr.op === 'record.get') {
        if (argTypes.length !== 2) throw new Error("record.get expects 2 args");
        const [recRaw, k] = argTypes;
        const rec = resolve(ctx, recRaw);
        if (rec.type !== 'Record') {
            const fieldName = expr.args[1].kind === 'Literal' && expr.args[1].value.kind === 'Str'
                ? expr.args[1].value.value
                : 'field';
            if (expr.args[0].kind === 'Var') {
                throw new Error(`Cannot access field ${fieldName} of non-record ${expr.args[0].name}`);
            }
            throw new Error(`Cannot access field ${fieldName} of non-record`);
        }
        if (k.type !== 'Str') throw new Error("record.get expects Str key");

        if (expr.args[1].kind === 'Literal' && expr.args[1].value.kind === 'Str') {
            const keyVal = expr.args[1].value.value;
            const fieldType = rec.fields[keyVal];
            if (!fieldType) throw new Error(`Unknown field ${keyVal} in record`);
            return { type: fieldType, eff: joinedEff };
        }
        throw new Error("record.get requires literal string key");
    }

    if (expr.op === 'http.parse_request') {
        joinedEff = joinEffects(joinedEff, '!Pure');
        const headerType: IrisType = { type: 'Record', fields: { key: { type: 'Str' }, val: { type: 'Str' } } };
        const httpReqType: IrisType = { type: 'Record', fields: { method: { type: 'Str' }, path: { type: 'Str' }, headers: { type: 'List', inner: headerType }, body: { type: 'Str' } } };
        return { type: { type: 'Result', ok: httpReqType, err: { type: 'Str' } }, eff: joinedEff };
    }

    if (expr.op === 'http.parse_response') {
        joinedEff = joinEffects(joinedEff, '!Pure');
        const headerType: IrisType = { type: 'Record', fields: { key: { type: 'Str' }, val: { type: 'Str' } } };
        const httpResType: IrisType = { type: 'Record', fields: { version: { type: 'Str' }, status: { type: 'I64' }, headers: { type: 'List', inner: headerType }, body: { type: 'Str' } } };
        return { type: { type: 'Result', ok: httpResType, err: { type: 'Str' } }, eff: joinedEff };
    }

    if (expr.op === 'http.get' || expr.op === 'http.post') {
        if (expr.op === 'http.get') {
            if (argTypes.length !== 1) throw new Error("http.get expects 1 arg (url)");
            if (argTypes[0].type !== 'Str') throw new Error("http.get expects Str url");
        } else {
            if (argTypes.length !== 2) throw new Error("http.post expects 2 args (url, body)");
            if (argTypes[0].type !== 'Str' || argTypes[1].type !== 'Str') {
                throw new Error("http.post expects (Str url, Str body)");
            }
        }

        joinedEff = joinEffects(joinedEff, '!Net');
        const headerType: IrisType = { type: 'Record', fields: { key: { type: 'Str' }, val: { type: 'Str' } } };
        const httpResType: IrisType = { type: 'Record', fields: { version: { type: 'Str' }, status: { type: 'I64' }, headers: { type: 'List', inner: headerType }, body: { type: 'Str' } } };
        return { type: { type: 'Result', ok: httpResType, err: { type: 'Str' } }, eff: joinedEff };
    }

    throw new Error(`Unknown intrinsic: ${expr.op}`);
}
