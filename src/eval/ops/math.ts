
import { Value, IntrinsicOp } from '../../types';

export function evalMath(op: IntrinsicOp, args: Value[]): Value {
    // Comparators
    if (op === '=') {
        const v1 = args[0] as any;
        const v2 = args[1] as any;

        const r1 = typeof v1 === 'bigint' ? { kind: 'I64', value: v1 } : (typeof v1 === 'string' ? { kind: 'Str', value: v1 } : v1);
        const r2 = typeof v2 === 'bigint' ? { kind: 'I64', value: v2 } : (typeof v2 === 'string' ? { kind: 'Str', value: v2 } : v2);

        if (r1.kind === 'I64' && r2.kind === 'I64') return { kind: 'Bool', value: r1.value === r2.value };
        if (r1.kind === 'Str' && r2.kind === 'Str') return { kind: 'Bool', value: r1.value === r2.value };
        if (r1.kind === 'Bool' && r2.kind === 'Bool') return { kind: 'Bool', value: r1.value === r2.value };
        return { kind: 'Bool', value: false };
    }

    if (['+', '-', '*', '/', '%', '<=', '<', '>=', '>'].includes(op)) {
        let v1 = args[0] as any;
        let v2 = args[1] as any;

        const a = typeof v1 === 'bigint' ? v1 : (v1.kind === 'I64' ? v1.value : null);
        const b = typeof v2 === 'bigint' ? v2 : (v2.kind === 'I64' ? v2.value : null);

        if (a === null || b === null) throw new Error(`Math expects I64 for ${op}, got ${typeof v1 === 'bigint' ? 'bigint' : v1.kind} and ${typeof v2 === 'bigint' ? 'bigint' : v2.kind} `);

        const na = a as bigint;
        const nb = b as bigint;

        switch (op) {
            case '+': return { kind: 'I64', value: na + nb };
            case '-': return { kind: 'I64', value: na - nb };
            case '*': return { kind: 'I64', value: na * nb };
            case '%': {
                if (nb === 0n) throw new Error("Modulo by zero");
                return { kind: 'I64', value: na % nb };
            }
            case '/': {
                if (nb === 0n) throw new Error("Division by zero");
                return { kind: 'I64', value: na / nb };
            }
            case '<=': return { kind: 'Bool', value: na <= nb };
            case '<': return { kind: 'Bool', value: na < nb };
            case '>=': return { kind: 'Bool', value: na >= nb };
            case '>': return { kind: 'Bool', value: na > nb };
        }
    }

    if (op === '&&') {
        const v1 = args[0]; const v2 = args[1];
        if (v1.kind !== 'Bool' || v2.kind !== 'Bool') throw new Error("&& expects Bool");
        return { kind: 'Bool', value: v1.value && v2.value };
    }
    if (op === '||') {
        const v1 = args[0]; const v2 = args[1];
        if (v1.kind !== 'Bool' || v2.kind !== 'Bool') throw new Error("|| expects Bool");
        return { kind: 'Bool', value: v1.value || v2.value };
    }
    if (op === '!') {
        const v1 = args[0];
        if (v1.kind !== 'Bool') throw new Error("! expects Bool");
        return { kind: 'Bool', value: !v1.value };
    }

    if (op === 'i64.from_string') {
        const val = args[0];
        if (val.kind !== 'Str') throw new Error("i64.from_string expects Str");
        if (val.value === "") throw new Error("i64.from_string: empty string");
        return { kind: 'I64', value: BigInt(val.value) };
    }

    if (op === 'i64.to_string') {
        const val = args[0] as any;
        if (typeof val === 'bigint') return { kind: 'Str', value: val.toString() };
        if (val.kind !== 'I64') throw new Error("i64.to_string expects I64");
        return { kind: 'Str', value: val.value.toString() };
    }

    if (op === 'rand.u64') {
        const hi = Math.floor(Math.random() * 0x100000000);
        const lo = Math.floor(Math.random() * 0x100000000);
        return { kind: 'I64', value: (BigInt(hi) << 32n) | BigInt(lo) };
    }

    throw new Error(`Unknown math op: ${op}`);
}
