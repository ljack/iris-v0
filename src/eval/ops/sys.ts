
import { Value, IntrinsicOp } from '../../types';
import { InterpreterContext } from '../context';
import { ProcessManager } from '../../runtime/process';

export async function evalSys(ctx: InterpreterContext, op: IntrinsicOp, args: Value[]): Promise<Value> {
    if (op === 'sys.self') {
        return { kind: 'I64', value: BigInt(ctx.pid) };
    }

    if (op === 'sys.args') {
        const argsList = ctx.args.map(a => ({ kind: 'Str', value: a } as Value));
        return { kind: 'List', items: argsList };
    }

    if (op === 'sys.spawn') {
        const fnName = args[0];
        if (fnName.kind !== 'Str') throw new Error("sys.spawn expects function name (Str)");

        const childPid = ctx.spawn(fnName.value);
        return { kind: 'I64', value: BigInt(childPid) };
    }

    if (op === 'sys.send') {
        const pid = args[0];
        const msg = args[1];
        if (pid.kind !== 'I64') throw new Error("sys.send expects PID (I64)");
        if (msg.kind !== 'Str') throw new Error("sys.send expects Msg (Str)");

        const sent = ProcessManager.instance.send(Number(pid.value), msg.value);
        return { kind: 'Bool', value: sent };
    }

    if (op === 'sys.recv') {
        const msg = await ProcessManager.instance.recv(ctx.pid);
        return { kind: 'Str', value: msg };
    }

    if (op === 'sys.sleep') {
        const ms = args[0];
        if (ms.kind !== 'I64') throw new Error("sys.sleep expects I64 ms");
        await new Promise(resolve => setTimeout(resolve, Number(ms.value)));
        return { kind: 'Bool', value: true };
    }

    throw new Error(`Unknown sys op: ${op}`);
}
