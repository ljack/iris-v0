
import { Value } from '../types';

export function valueToKey(v: Value): string {
    if (v.kind === 'I64') return `I64:${v.value}`;
    if (v.kind === 'Str') return `Str:${v.value}`;
    if (v.kind === 'Tagged') {
        if (v.tag === 'Str') {
            if (v.value.kind === 'Str') return `Str:${v.value.value}`;
            if ((v.value as any).value && typeof (v.value as any).value === 'string') return `Str:${(v.value as any).value} `;
            return `Str:${JSON.stringify(v.value)} `;
        }
        if (v.tag === 'I64') {
            if (v.value.kind === 'I64') return `I64:${v.value.value} `;
            return `I64:${JSON.stringify(v.value)} `;
        }
        return `Tagged:${v.tag}:${JSON.stringify(v.value, (_, val) => typeof val === 'bigint' ? val.toString() : val)} `;
    }
    throw new Error(`Runtime: Invalid map key type: ${v.kind} `);
}

export function keyToValue(k: string): Value {
    if (k.startsWith('I64:')) {
        return { kind: 'I64', value: BigInt(k.substring(4)) };
    }
    if (k.startsWith('Str:')) {
        return { kind: 'Str', value: k.substring(4) };
    }
    if (k.startsWith('Tagged:')) {
        const firstColon = k.indexOf(':');
        const secondColon = k.indexOf(':', firstColon + 1);
        if (secondColon === -1) throw new Error(`Runtime: Invalid tagged key format: ${k} `);
        const tag = k.substring(firstColon + 1, secondColon);
        const json = k.substring(secondColon + 1);
        const val = JSON.parse(json, (_, v) => {
            if (typeof v === 'string' && /^\d+n$/.test(v)) return BigInt(v.slice(0, -1));
            return v;
        });
        throw new Error("Tagged keys not fully supported in keyToValue yet");
    }
    throw new Error(`Runtime: Invalid map key string: ${k} `);
}
