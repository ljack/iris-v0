
import { Value, IntrinsicOp } from '../../types';
import { valueToKey, keyToValue } from '../utils';

export function evalData(op: IntrinsicOp, args: Value[]): Value | undefined {
    if (op === 'str.concat' || op === 'str.concat_temp') {
        return { kind: 'Str', value: ((args[0] as any)?.value || "") + ((args[1] as any)?.value || "") };
    }
    if (op === 'str.temp_reset') return { kind: 'I64', value: 0n };
    if (op === 'str.eq') return { kind: 'Bool', value: ((args[0] as any)?.value || "") === ((args[1] as any)?.value || "") };
    if (op === 'str.len') return { kind: 'I64', value: BigInt(((args[0] as any)?.value || "").length) };
    if (op === 'str.get') {
        const s = (args[0] as any).value; const i = Number((args[1] as any).value);
        if (i >= 0 && i < s.length) return { kind: 'Option', value: { kind: 'I64', value: BigInt(s.charCodeAt(i)) } };
        return { kind: 'Option', value: null };
    }
    if (op === 'str.substring') return { kind: 'Str', value: (args[0] as any).value.substring(Number((args[1] as any).value), Number((args[2] as any).value)) };
    if (op === 'str.from_code') return { kind: 'Str', value: String.fromCharCode(Number((args[0] as any).value)) };
    if (op === 'str.index_of') {
        const s = (args[0] as any).value; const sub = (args[1] as any).value;
        const idx = s.indexOf(sub);
        if (idx === -1) return { kind: 'Option', value: null };
        return { kind: 'Option', value: { kind: 'I64', value: BigInt(idx) } };
    }
    if (op === 'str.contains') return { kind: 'Bool', value: (args[0] as any).value.includes((args[1] as any).value) };
    if (op === 'str.ends_with') return { kind: 'Bool', value: (args[0] as any).value.endsWith((args[1] as any).value) };

    if (op === 'cons') {
        const h = args[0];
        const t = args[1];
        if (t.kind === 'Tagged' && t.tag === 'nil') {
            return { kind: 'List', items: [h] };
        }
        if (t.kind !== 'List') throw new Error("cons arguments must be (head, tail-list)");
        return { kind: 'List', items: [h, ...t.items] };
    }

    if (op.startsWith('list.')) {
        if (op === 'list.length') return { kind: 'I64', value: BigInt((args[0] as any).items.length) };
        if (op === 'list.get') {
            const l = (args[0] as any).items; const i = Number((args[1] as any).value);
            if (i >= 0 && i < l.length) return { kind: 'Option', value: l[i] };
            return { kind: 'Option', value: null };
        }
        if (op === 'list.concat') return { kind: 'List', items: [...(args[0] as any).items, ...(args[1] as any).items] };
        if (op === 'list.unique') {
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
            return { kind: 'List', items };
        }
    }

    if (op.startsWith('map.')) {
        if (op === 'map.make') return { kind: 'Map', value: new Map() };
        if (op === 'map.put') {
            const m = args[0] as any; const k = args[1]; const v = args[2];
            const newMap = new Map<string, Value>(m.value);
            newMap.set(valueToKey(k), v);
            return { kind: 'Map', value: newMap };
        }
        if (op === 'map.get') {
            const m = args[0] as any; const k = args[1];
            const v = m.value.get(valueToKey(k));
            return v ? { kind: 'Option', value: v } : { kind: 'Option', value: null };
        }
        if (op === 'map.contains') return { kind: 'Bool', value: (args[0] as any).value.has(valueToKey(args[1])) };
        if (op === 'map.keys') {
            const m = args[0] as any;
            const keys = Array.from((m.value as Map<string, Value>).keys()).map((k: string) => keyToValue(k));
            return { kind: 'List', items: keys };
        }
    }

    if (op === 'record.set') {
        const r = args[0]; const f = args[1]; const v = args[2];
        if (r.kind !== 'Record' || f.kind !== 'Str') throw new Error("record.set expects Record and Str");
        return { kind: 'Record', fields: { ...r.fields, [f.value]: v } };
    }

    if (op === 'record.get') {
        const r = args[0]; const f = args[1];
        if (r.kind !== 'Record') throw new Error(`Cannot access field ${f.kind === 'Str' ? f.value : '?'} of non-record ${r.kind}`);
        if (f.kind !== 'Str') throw new Error("record.get expects Record and Str");
        const val = r.fields[f.value];
        if (val === undefined) throw new Error(`Unknown field ${f.value} in record`);
        return val;
    }

    if (op === 'tuple.get') {
        const t = args[0]; const i = args[1];
        if (t.kind !== 'Tuple' || i.kind !== 'I64') throw new Error("tuple.get expects Tuple and I64");
        const idx = Number(i.value);
        if (idx < 0 || idx >= t.items.length) throw new Error(`Tuple index out of bounds: ${idx}`);
        return t.items[idx];
    }

    return undefined;
}
