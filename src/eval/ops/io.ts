
import { Value, IntrinsicOp } from '../../types';
import { InterpreterContext } from '../context';

export function evalIo(ctx: InterpreterContext, op: IntrinsicOp, args: Value[]): Value {
    if (op === 'io.read_file') {
        const path = args[0];
        if (path.kind !== 'Str') throw new Error("path must be string");
        const content = ctx.fs.readFile(path.value);
        if (content !== null) {
            return { kind: 'Result', isOk: true, value: { kind: 'Str', value: content } };
        } else {
            return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "ENOENT" } };
        }
    }

    if (op === 'io.write_file') {
        const path = args[0];
        const content = args[1];
        if (path.kind !== 'Str') throw new Error("path must be string");
        if (content.kind !== 'Str') throw new Error("content must be string");
        ctx.fs.writeFile(path.value, content.value);
        return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(content.value.length) } };
    }

    if (op === 'io.file_exists') {
        const path = args[0];
        if (path.kind !== 'Str') throw new Error("path must be string");
        return { kind: 'Bool', value: ctx.fs.exists(path.value) };
    }

    if (op === 'io.read_dir') {
        const path = args[0];
        if (path.kind !== 'Str') throw new Error("path must be string");
        if (!ctx.fs.readDir) return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Not supported" } };

        const entries = ctx.fs.readDir(path.value);
        if (entries === null) return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Directory not found or error" } };

        const listVal: Value = {
            kind: 'List',
            items: entries.map(s => ({ kind: 'Str', value: s }))
        };
        return { kind: 'Result', isOk: true, value: listVal };
    }

    if (op === 'io.print') {
        const val = args[0];
        if (val.kind === 'Str') {
            console.log(val.value);
        } else if (val.kind === 'I64' || val.kind === 'Bool') {
            console.log(val.value.toString());
        } else {
            console.log(JSON.stringify(val, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        }
        return { kind: 'I64', value: 0n };
    }

    throw new Error(`Unknown io op: ${op}`);
}
