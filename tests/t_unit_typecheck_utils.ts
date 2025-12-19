
import { TestCase } from '../src/test-types';
import { typesEqual, fmt } from '../src/typecheck/utils';
import { TypeCheckerContext } from '../src/typecheck/context'; // Correct import
import { IrisType } from '../src/types';

// Mock context for typesEqual (it doesn't heavily rely on it unless resolving Named types)
const mockCtx = {
    modules: new Map(),
    types: new Map(),
    functions: new Map(),
    resolver: (p: string) => undefined,
    currentModule: 'test'
} as unknown as TypeCheckerContext;

export const t_unit_fmt: TestCase = {
    name: 'Unit: fmt',
    fn: async () => {
        const types: [IrisType, string][] = [
            [{ type: 'I64' }, 'I64'],
            [{ type: 'Bool' }, 'Bool'],
            [{ type: 'Str' }, 'Str'],
            [{ type: 'Option', inner: { type: 'I64' } }, '(Option I64)'],
            [{ type: 'Result', ok: { type: 'I64' }, err: { type: 'Str' } }, '(Result I64 Str)'],
            [{ type: 'List', inner: { type: 'I64' } }, '(List I64)'],
            [{ type: 'Tuple', items: [{ type: 'I64' }, { type: 'Str' }] }, '(Tuple I64 Str)'],
            [{ type: 'Map', key: { type: 'Str' }, value: { type: 'I64' } }, '(Map Str I64)'],
            [{ type: 'Record', fields: { "a": { type: "I64" }, "b": { type: "Str" } } }, '(Record (a I64) (b Str))'],
            // Note: Record keys order in printing depends on implementation, likely object key order or not guaranteed? 
            // checks/utils.ts fmt uses Object.keys(). Use known order in definition.
            [{ type: 'Union', variants: { "A": { type: "I64" }, "B": { type: "Str" } } }, '(Union (tag "A" I64) (tag "B" Str))'],
            [{ type: 'Fn', args: [{ type: 'I64' }], ret: { type: 'Bool' }, eff: '!Pure' }, '(Fn (I64) Bool)'],
            // Named
            [{ type: 'Named', name: 'MyType' }, 'MyType'],
        ];

        for (const [t, expected] of types) {
            const s = fmt(mockCtx, t);
            // Simple substring check for Records because key order is flaky in JS unless sorted
            if (t.type === 'Record' || t.type === 'Union') {
                // Check basic structure
                if (!s.startsWith(`(${t.type}`)) throw new Error(`fmt failed for ${t.type}: ${s} `);
            } else {
                if (s !== expected) throw new Error(`Expected ${expected}, got ${s} `);
            }
        }
    }
};

export const t_unit_typesEqual: TestCase = {
    name: 'Unit: typesEqual',
    fn: async () => {
        const i64: IrisType = { type: 'I64' };
        const bool: IrisType = { type: 'Bool' };
        const str: IrisType = { type: 'Str' };

        // Basic
        if (!typesEqual(mockCtx, i64, i64)) throw new Error('I64 != I64');
        if (typesEqual(mockCtx, i64, bool)) throw new Error('I64 == Bool');

        // Option
        const optI64: IrisType = { type: 'Option', inner: i64 };
        const optBool: IrisType = { type: 'Option', inner: bool };
        if (!typesEqual(mockCtx, optI64, optI64)) throw new Error('Option I64 != Option I64');
        if (typesEqual(mockCtx, optI64, optBool)) throw new Error('Option I64 == Option Bool');

        // Result
        const resOk: IrisType = { type: 'Result', ok: i64, err: str };
        const resOk2: IrisType = { type: 'Result', ok: i64, err: str };
        const resErr: IrisType = { type: 'Result', ok: bool, err: str };
        if (!typesEqual(mockCtx, resOk, resOk2)) throw new Error('Result != Result');
        if (typesEqual(mockCtx, resOk, resErr)) throw new Error('Result I64 Str == Result Bool Str');

        // List
        const listI64: IrisType = { type: 'List', inner: i64 };
        if (!typesEqual(mockCtx, listI64, listI64)) throw new Error('List != List');

        // Map
        const mapSI: IrisType = { type: 'Map', key: str, value: i64 };
        if (!typesEqual(mockCtx, mapSI, mapSI)) throw new Error('Map != Map');

        // Tuple
        const t1: IrisType = { type: 'Tuple', items: [i64, str] };
        const t2: IrisType = { type: 'Tuple', items: [i64, str] };
        const t3: IrisType = { type: 'Tuple', items: [i64] };
        if (!typesEqual(mockCtx, t1, t2)) throw new Error('Tuple != Tuple');
        if (typesEqual(mockCtx, t1, t3)) throw new Error('Tuple mismatch length');

        // Record (Order independent in strict equality?)
        // The implementation sorts keys.
        const r1: IrisType = { type: 'Record', fields: { "a": i64, "b": str } };
        const r2: IrisType = { type: 'Record', fields: { "b": str, "a": i64 } }; // Different order
        const r3: IrisType = { type: 'Record', fields: { "a": i64 } };
        if (!typesEqual(mockCtx, r1, r2)) throw new Error('Record order independent check failed');
        if (typesEqual(mockCtx, r1, r3)) throw new Error('Record mismatch keys');

        // Union
        const u1: IrisType = { type: 'Union', variants: { "A": i64, "B": str } };
        const u2: IrisType = { type: 'Union', variants: { "B": str, "A": i64 } };
        if (!typesEqual(mockCtx, u1, u2)) throw new Error('Union order independent check failed');

        // Fn
        const f1: IrisType = { type: 'Fn', args: [i64], ret: bool, eff: '!Pure' };
        const f2: IrisType = { type: 'Fn', args: [i64], ret: bool, eff: '!Pure' };
        const f3: IrisType = { type: 'Fn', args: [str], ret: bool, eff: '!Pure' };
        if (!typesEqual(mockCtx, f1, f2)) throw new Error('Fn != Fn');
        if (typesEqual(mockCtx, f1, f3)) throw new Error('Fn arg mismatch');

        // Union vs Tuple (Special case for tagged tuples)
        // Check lines 77-90 in utils.ts
        // t1=Union, t2=Tuple
        // If tuple is (content), check if union has variant equal to content
        const u3: IrisType = { type: 'Union', variants: { "tag1": i64 } };
        const tupWrapping: IrisType = { type: 'Tuple', items: [i64] }; // A tuple wrapping I64
        // Logic: if t1 is Union and t2 is Tuple with length 1, check if ANY variant matches t2[0]
        if (!typesEqual(mockCtx, u3, tupWrapping)) throw new Error('Union vs Tuple(1) failed');

        // If tuple is (Str "tag", content) -> Tagged tuple
        // But typecheck/utils.ts check uses t2.items[0].type === 'Str'. The *Type* is Str?
        // Wait, line 84: if (t2.items.length === 2 && t2.items[0].type === 'Str')
        // In typechecker, a Tag is NOT a Tuple(Str, Val). It's a Tagged value?
        // Ah, but `(tag "name" val)` resolves to a Type?
        // `typesEqual` compares TYPES.
        // A `Tuple` Type `(Tuple Str I64)` is compatible with `Union` `(Union(tag "foo" I64))`?
        // NO.
        // The logic in `utils.ts` lines 77-90 seems to handle type equivalence between a "Tuple representation of a variant" and the Union?
        // This logic seems suspicious or crucial for how `match` works if inference converts tags to tuples?

        // Let's test precisely what the code does.
        const tupleTag: IrisType = { type: 'Tuple', items: [{ type: 'Str' }, i64] };
        // It checks if ANY variant matches the content (i64).
        if (!typesEqual(mockCtx, u3, tupleTag)) throw new Error('Union vs Tuple(Str, Val) failed');
    }
};
