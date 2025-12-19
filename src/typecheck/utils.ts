
import { IrisType, IrisEffect } from '../types';
import { TypeCheckerContext } from './context';

export function effectOrder(eff: IrisEffect): number {
    switch (eff) {
        case '!Pure': return 0;
        case '!IO': return 1;
        case '!Net': return 2;
        case '!Any': return 3;
        case '!Infer': return -1;
    }
    return 0;
}

export function joinEffects(e1: IrisEffect, e2: IrisEffect): IrisEffect {
    if (e1 === '!Infer' || e2 === '!Infer') return '!Pure';
    if (e1 === '!Any' || e2 === '!Any') return '!Any';
    if (e1 === '!Net' || e2 === '!Net') return '!Net';
    if (e1 === '!IO' || e2 === '!IO') return '!IO';
    return '!Pure';
}

export function checkEffectSubtype(ctx: TypeCheckerContext, required: IrisEffect, declared: IrisEffect, message: string) {
    if (declared === '!Infer') return;
    if (declared === '!Any') return;

    const ordReq = effectOrder(required);
    const ordDecl = effectOrder(declared);

    if (ordReq > ordDecl) {
        throw new Error(`TypeError: EffectMismatch: ${message}: Inferred ${required} but declared ${declared}`);
    }
}

export function resolve(ctx: TypeCheckerContext, t: IrisType): IrisType {
    if (t.type === 'Named') {
        if (ctx.types.has(t.name)) {
            return resolve(ctx, ctx.types.get(t.name)!);
        }
        return t;
    }
    return t;
}

export function fmt(ctx: TypeCheckerContext, t: IrisType): string {
    if (!t) return 'undefined';
    if (t.type === 'Named') return t.name;

    const resolved = resolve(ctx, t);
    if (resolved !== t && resolved.type !== 'Named') return fmt(ctx, resolved);

    switch (t.type) {
        case 'I64': return 'I64';
        case 'Bool': return 'Bool';
        case 'Str': return 'Str';
        case 'Option': return `(Option ${fmt(ctx, t.inner)})`;
        case 'Result': return `(Result ${fmt(ctx, t.ok)} ${fmt(ctx, t.err)})`;
        case 'List': return `(List ${fmt(ctx, t.inner)})`;
        case 'Tuple': return `(Tuple ${t.items.map(i => fmt(ctx, i)).join(' ')})`;
        case 'Map': return `(Map ${fmt(ctx, t.key)} ${fmt(ctx, t.value)})`;
        case 'Record': return `(Record ${Object.keys(t.fields).map(k => `(${k} ${fmt(ctx, t.fields[k])})`).join(' ')})`;
        case 'Union': return `(Union ${Object.keys(t.variants).map(k => `(tag "${k}" ${fmt(ctx, t.variants[k])})`).join(' ')})`;
        case 'Fn': return `(Fn (${t.args.map(a => fmt(ctx, a)).join(' ')}) ${fmt(ctx, t.ret)})`; // Should we show Effect? Maybe.
        default: return 'Unknown';
    }
}

export function typesEqual(ctx: TypeCheckerContext, t1: IrisType, t2: IrisType): boolean {
    const origT1 = t1;
    const origT2 = t2;
    t1 = resolve(ctx, t1);
    t2 = resolve(ctx, t2);

    if (t1 === t2) return true;

    if (t1.type !== t2.type) {
        if (t1.type === 'Union' && t2.type === 'Tuple') {
            if (t2.items.length === 1) {
                const content = t2.items[0];
                for (const variantType of Object.values(t1.variants)) {
                    if (typesEqual(ctx, variantType, content)) return true;
                }
            }
            if (t2.items.length === 2 && t2.items[0].type === 'Str') {
                const content = t2.items[1];
                for (const variantType of Object.values(t1.variants)) {
                    if (typesEqual(ctx, variantType, content)) return true;
                }
            }
        }
        return false;
    }

    if (t1.type === 'Named') return t1.name === (t2 as any).name;
    if (t1.type === 'I64') return true;
    if (t1.type === 'Bool') return true;
    if (t1.type === 'Str') return true;

    if (t1.type === 'Union' && t2.type === 'Union') {
        const t1Vars = (t1 as any).variants;
        const t2Vars = (t2 as any).variants;
        for (const [tag, type] of Object.entries(t2Vars)) {
            if (!t1Vars[tag]) return false;
            if (!typesEqual(ctx, t1Vars[tag] as IrisType, type as IrisType)) return false;
        }
        return true;
    }

    if (t1.type === 'Record' && t2.type === 'Record') {
        const k1 = Object.keys((t1 as any).fields).sort();
        const k2 = Object.keys((t2 as any).fields).sort();
        if (k1.length !== k2.length) return false;
        for (let i = 0; i < k1.length; i++) {
            if (k1[i] !== k2[i]) return false;
            if (!typesEqual(ctx, (t1 as any).fields[k1[i]], (t2 as any).fields[k2[i]])) return false;
        }
        return true;
    }

    if (t1.type === 'Option') {
        if (!(t1 as any).inner || !(t2 as any).inner) return false;
        return typesEqual(ctx, (t1 as any).inner, (t2 as any).inner);
    }
    if (t1.type === 'Result') {
        if (!(t1 as any).ok || !(t1 as any).err || !(t2 as any).ok || !(t2 as any).err) return false;
        return typesEqual(ctx, (t1 as any).ok, (t2 as any).ok) && typesEqual(ctx, (t1 as any).err, (t2 as any).err);
    }

    if (t1.type === 'List') {
        if (!(t1 as any).inner || !(t2 as any).inner) return false;
        return typesEqual(ctx, (t1 as any).inner, (t2 as any).inner);
    }
    if (t1.type === 'Map') {
        if (!(t1 as any).key || !(t1 as any).value || !(t2 as any).key || !(t2 as any).value) return false;
        return typesEqual(ctx, (t1 as any).key, (t2 as any).key) && typesEqual(ctx, (t1 as any).value, (t2 as any).value);
    }
    if (t1.type === 'Tuple') {
        const i1 = (t1 as any).items;
        const i2 = (t2 as any).items;
        if (!i1 || !i2 || i1.length !== i2.length) return false;
        for (let i = 0; i < i1.length; i++) {
            if (!typesEqual(ctx, i1[i], i2[i])) return false;
        }
        return true;
    }

    if (t1.type === 'Fn' && t2.type === 'Fn') {
        if (t1.args.length !== t2.args.length) return false;
        for (let i = 0; i < t1.args.length; i++) {
            if (!typesEqual(ctx, t1.args[i], t2.args[i])) return false;
        }
        if (!typesEqual(ctx, t1.ret, t2.ret)) return false;
        return t1.eff === t2.eff;
    }

    return false;
}

export function expectType(ctx: TypeCheckerContext, expected: IrisType, actual: IrisType, message: string) {
    if (!typesEqual(ctx, expected, actual)) {
        throw new Error(`TypeError: ${message}: Expected ${fmt(ctx, expected)}, got ${fmt(ctx, actual)}`);
    }
}

export function qualifyType(ctx: TypeCheckerContext, t: IrisType, alias: string, exported: Set<string>): IrisType {
    if (t.type === 'Named') {
        if (exported.has(t.name)) {
            return { type: 'Named', name: `${alias}.${t.name}` };
        }
        return t;
    }
    if (t.type === 'Option') return { ...t, inner: qualifyType(ctx, t.inner, alias, exported) };
    if (t.type === 'Result') return { ...t, ok: qualifyType(ctx, t.ok, alias, exported), err: qualifyType(ctx, t.err, alias, exported) };
    if (t.type === 'List') return { ...t, inner: qualifyType(ctx, t.inner, alias, exported) };
    if (t.type === 'Tuple') return { ...t, items: t.items.map(i => qualifyType(ctx, i, alias, exported)) };
    if (t.type === 'Record') {
        const newFields: any = {};
        for (const k in t.fields) newFields[k] = qualifyType(ctx, t.fields[k], alias, exported);
        return { ...t, fields: newFields };
    }
    if (t.type === 'Union') {
        const newVars: any = {};
        for (const k in t.variants) newVars[k] = qualifyType(ctx, t.variants[k], alias, exported);
        return { ...t, variants: newVars };
    }
    if (t.type === 'Map') return { ...t, key: qualifyType(ctx, t.key, alias, exported), value: qualifyType(ctx, t.value, alias, exported) };
    if (t.type === 'Fn') return {
        ...t,
        args: t.args.map(a => qualifyType(ctx, a, alias, exported)),
        ret: qualifyType(ctx, t.ret, alias, exported)
    };
    return t;
}
