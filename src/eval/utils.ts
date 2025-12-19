
import { Value } from '../types';

export function valueToKey(v: Value): string {
    if (v.kind === 'I64') return `I64:${v.value}`;
    if (v.kind === 'Str') return `Str:${v.value}`;
    if (v.kind === 'Tagged') {
        return `Tagged:${v.tag}:${JSON.stringify(v.value, (_, val) => typeof val === 'bigint' ? val.toString() + 'n' : val)}`;
    }
    throw new Error(`Runtime: Invalid map key type: ${v.kind}`);
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
        if (secondColon === -1) throw new Error(`Runtime: Invalid tagged key format: ${k}`);
        const tag = k.substring(firstColon + 1, secondColon);
        const json = k.substring(secondColon + 1);
        const val = JSON.parse(json, (_, v) => {
            if (typeof v === 'string' && /^\d+n$/.test(v)) return BigInt(v.slice(0, -1));
            return v;
        });
        // We need to guess the value kind from JSON
        // Primitive values (I64, Str, Bool) or Tuple/List/Record?
        // JSON cannot fully reconstruct specific Iris Types without schema.
        // For I64 map tests, we simplified.
        // But (tag "I64" 42) -> value is 42 (number/bigint).
        // If val is BigInt, it's I64.
        const kind = typeof val === 'bigint' ? 'I64' : typeof val === 'string' ? "Str" : "Tuple"; // Approximation
        // Better: reconstruct recursively.
        // Since we serialization used JSON.stringify(v.value), v.value is a Value object (kind, value).
        // Oh wait. v.value IS a Value object definition?
        // No. JSON.stringify(v.value) serializes the Value object!
        // { kind: 'I64', value: ... }
        // So JSON.parse returns the Value object structure!
        return { kind: 'Tagged', tag, value: val };
    }
    throw new Error(`Runtime: Invalid map key string: ${k}`);
}
