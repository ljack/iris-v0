import { Value } from '../types';

export type ToolFn = (...args: any[]) => any | Promise<any>;

export interface ToolRegistry {
    [name: string]: ToolFn | undefined;
}

export function valueToJs(v: Value): any {
    switch (v.kind) {
        case 'I64': return v.value;
        case 'Bool': return v.value;
        case 'Str': return v.value;
        case 'Option': return v.value === null ? null : valueToJs(v.value);
        case 'Result': return v.isOk ? { ok: valueToJs(v.value) } : { err: valueToJs(v.value) };
        case 'List': return v.items.map(valueToJs);
        case 'Tuple': return v.items.map(valueToJs);
        case 'Record': {
            const obj: Record<string, any> = {};
            for (const [k, val] of Object.entries(v.fields)) obj[k] = valueToJs(val);
            return obj;
        }
        case 'Tagged': return { tag: v.tag, value: valueToJs(v.value) };
        case 'Map': return {};
        case 'Lambda': return null;
    }
    return null;
}

export function jsToValue(v: any): Value {
    if (v && typeof v === 'object' && typeof v.kind === 'string') return v as Value;
    if (typeof v === 'bigint') return { kind: 'I64', value: v };
    if (typeof v === 'number') return { kind: 'I64', value: BigInt(v) };
    if (typeof v === 'string') return { kind: 'Str', value: v };
    if (typeof v === 'boolean') return { kind: 'Bool', value: v };
    if (v === null || v === undefined) return { kind: 'Option', value: null };
    if (Array.isArray(v)) return { kind: 'List', items: v.map(jsToValue) };
    if (typeof v === 'object') {
        const fields: Record<string, Value> = {};
        for (const [k, val] of Object.entries(v)) fields[k] = jsToValue(val);
        return { kind: 'Record', fields };
    }
    return { kind: 'Str', value: String(v) };
}
