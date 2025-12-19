
import { TestCase } from '../src/test-types';
import { IInterpreter } from '../src/eval/interfaces';
import { Interpreter } from '../src/eval/interpreter';
import { Program, Value, Expr } from '../src/types';
import { evalHttp } from '../src/eval/ops/http';
import { evalIo } from '../src/eval/ops/io';
import { evalSys } from '../src/eval/ops/sys';
import { evalMath } from '../src/eval/ops/math';
import { evalData } from '../src/eval/ops/data';

// Helper for interpreter ctx
function createMockCtx(): IInterpreter {
    return new Interpreter({ module: { name: 'mock', version: 1 }, imports: [], defs: [] });
}

export const t393_ops_coverage: TestCase = {
    name: 'Test 393: Ops Coverage',
    fn: async () => {
        const ctx = createMockCtx();

        // 1. HTTP Ops Coverage
        try {
            evalHttp('http.unknown' as any, []);
            throw new Error("Should have thrown for unknown http op");
        } catch (e: any) {
            if (!e.message.includes('Unknown http op')) throw new Error("Wrong error http unknown");
        }

        // 2. IO Ops Coverage
        try {
            await evalIo(ctx, 'io.unknown' as any, []);
            throw new Error("Should have thrown for unknown io op");
        } catch (e: any) {
            if (!e.message.includes('Unknown io op')) throw new Error("Wrong error io unknown: " + e.message);
        }

        // 3. Sys Ops Coverage
        try {
            await evalSys(ctx, 'sys.unknown' as any, []);
            throw new Error("Should have thrown for unknown sys op");
        } catch (e: any) {
            if (!e.message.includes('Unknown sys op')) throw new Error("Wrong error sys unknown");
        }

        // Sys Arg Errors
        try { await evalSys(ctx, 'sys.spawn', [{ kind: 'I64', value: 1n }]); throw new Error("sys.spawn invalid arg"); } catch (e: any) { if (!e.message.includes('expects function name')) throw e; }
        try { await evalSys(ctx, 'sys.send', [{ kind: 'Str', value: 'bad' }, { kind: 'Str', value: 'msg' }]); throw new Error("sys.send invalid pid"); } catch (e: any) { if (!e.message.includes('expects PID')) throw e; }
        try { await evalSys(ctx, 'sys.send', [{ kind: 'I64', value: 1n }, { kind: 'I64', value: 1n }]); throw new Error("sys.send invalid msg"); } catch (e: any) { if (!e.message.includes('expects Msg')) throw e; }
        try { await evalSys(ctx, 'sys.sleep', [{ kind: 'Str', value: 'bad' }]); throw new Error("sys.sleep invalid arg"); } catch (e: any) { if (!e.message.includes('expects I64')) throw e; }

        // 4. Math Ops Coverage
        try {
            evalMath('math.unknown' as any, []);
            throw new Error("Should have thrown for unknown math op");
        } catch (e: any) {
            if (!e.message.includes('Unknown math op')) throw new Error("Wrong error math unknown");
        }

        // Math Div/Mod Zero
        try { evalMath('/', [{ kind: 'I64', value: 10n }, { kind: 'I64', value: 0n }]); throw new Error("Div zero"); } catch (e: any) { if (!e.message.includes('Division by zero')) throw e; }
        try { evalMath('%', [{ kind: 'I64', value: 10n }, { kind: 'I64', value: 0n }]); throw new Error("Mod zero"); } catch (e: any) { if (!e.message.includes('Modulo by zero')) throw e; }

        // Math Type Errors
        try { evalMath('+', [{ kind: 'Str', value: 's' }, { kind: 'I64', value: 1n }]); throw new Error("Math type error"); } catch (e: any) { if (!e.message.includes('expects I64')) throw e; }
        try { evalMath('&&', [{ kind: 'I64', value: 1n }, { kind: 'Bool', value: true }]); throw new Error("&& type error"); } catch (e: any) { if (!e.message.includes('expects Bool')) throw e; }
        try { evalMath('||', [{ kind: 'Bool', value: true }, { kind: 'I64', value: 1n }]); throw new Error("|| type error"); } catch (e: any) { if (!e.message.includes('expects Bool')) throw e; }
        try { evalMath('!', [{ kind: 'I64', value: 1n }]); throw new Error("! type error"); } catch (e: any) { if (!e.message.includes('expects Bool')) throw e; }
        try { evalMath('i64.from_string', [{ kind: 'I64', value: 1n }]); throw new Error("from_string type error"); } catch (e: any) { if (!e.message.includes('expects Str')) throw e; }
        try { evalMath('i64.from_string', [{ kind: 'Str', value: '' }]); throw new Error("from_string empty"); } catch (e: any) { if (!e.message.includes('empty string')) throw e; }
        try { evalMath('i64.to_string', [{ kind: 'Str', value: 's' }]); throw new Error("to_string type error"); } catch (e: any) { if (!e.message.includes('expects I64')) throw e; }

        // 5. Data Ops Coverage
        const res = evalData('unknown' as any, []);
        if (res !== undefined) throw new Error("evalData unknown op should return undefined");

        // cons errors
        try {
            evalData('cons', [{ kind: 'I64', value: 1n }, { kind: 'I64', value: 2n }]);
            throw new Error("Should have thrown for cons with non-list tail");
        } catch (e: any) {
            if (!e.message.includes('cons arguments must be')) throw new Error("Wrong error cons mismatch");
        }

        // record.get errors
        try {
            evalData('record.get', [{ kind: 'I64', value: 1n }, { kind: 'Str', value: 'f' }]);
            throw new Error("Should have thrown for record.get on non-record");
        } catch (e: any) {
            if (!e.message.includes('record.get expects Record')) throw new Error("Wrong error record.get types");
        }

        try {
            const r: Value = { kind: 'Record', fields: {} };
            evalData('record.get', [r, { kind: 'Str', value: 'missing' }]);
            throw new Error("Should have thrown for missing field");
        } catch (e: any) {
            if (!e.message.includes('not found')) throw new Error("Wrong error record.get missing");
        }

        // tuple.get errors
        try {
            evalData('tuple.get', [{ kind: 'I64', value: 1n }, { kind: 'I64', value: 0n }]);
            throw new Error("Should have thrown for tuple.get on non-tuple");
        } catch (e: any) {
            if (!e.message.includes('tuple.get expects Tuple')) throw new Error("Wrong error tuple.get types");
        }

        try {
            evalData('tuple.get', [{ kind: 'Tuple', items: [] }, { kind: 'I64', value: 0n }]);
            throw new Error("Should have thrown for tuple index out of bounds");
        } catch (e: any) {
            if (!e.message.includes('Tuple index out of bounds')) throw new Error("Wrong error tuple.get bounds");
        }

        console.log("Ops coverage tests passed basic checks");
    }
};
