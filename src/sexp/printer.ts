
import { Value } from '../types';

function escapeStr(s: string): string {
    return s.replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')
        .replace(/\r/g, '\\r');
}

export function printValue(v: Value): string {
    switch (v.kind) {
        case 'I64': return v.value.toString();
        case 'Bool': return v.value.toString();
        case 'Str': return `"${escapeStr(v.value)}"`;
        case 'Option': return v.value === null ? "None" : `(Some ${printValue(v.value)})`;
        case 'Result': return v.isOk ? `(Ok ${printValue(v.value)})` : `(Err ${printValue(v.value)})`;
        case 'List': return `(list ${v.items.map(printValue).join(' ')})`;
        case 'Tuple': return `(tuple ${v.items.map(printValue).join(' ')})`;
        case 'Record': {
            const keys = Object.keys(v.fields).sort();
            const content = keys.map(k => `(${k} ${printValue(v.fields[k])})`).join(' ');
            return `(record${content ? ' ' + content : ''})`;
        }
        case 'Map': return `(map)`; // Simplified for now
        case 'Tagged': return `(tag "${v.tag}" ${printValue(v.value)})`;
        case 'Lambda': return "Lambda";
    }
    return `UnknownValue(${(v as any).kind})`;

}
