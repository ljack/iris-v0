
import { Value, IntrinsicOp } from '../../types';
import { InterpreterContext } from '../context';

export async function evalNet(ctx: InterpreterContext, op: IntrinsicOp, args: Value[]): Promise<Value> {
    if (op === 'net.listen') {
        const port = args[0];
        if (port.kind !== 'I64') throw new Error("net.listen expects I64 port");
        const h = await ctx.net.listen(Number(port.value));
        if (h !== null) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(h) } };
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Listen failed" } };
    }
    if (op === 'net.accept') {
        const serverSock = args[0];
        if (serverSock.kind !== 'I64') throw new Error("net.accept expects I64");
        const h = await ctx.net.accept(Number(serverSock.value));
        if (h !== null) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(h) } };
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Accept failed" } };
    }
    if (op === 'net.read') {
        const sock = args[0];
        if (sock.kind !== 'I64') throw new Error("net.read expects I64");
        const s = await ctx.net.read(Number(sock.value));
        if (s !== null) return { kind: 'Result', isOk: true, value: { kind: 'Str', value: s } };
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Read failed" } };
    }
    if (op === 'net.write') {
        const sock = args[0];
        const str = args[1];
        if (sock.kind !== 'I64') throw new Error("net.write expects I64");
        if (str.kind !== 'Str') throw new Error("net.write expects Str");
        const s = await ctx.net.write(Number(sock.value), str.value);
        if (s) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(s ? 1 : 0) } };
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Write failed" } };
    }
    if (op === 'net.close') {
        const sock = args[0];
        if (sock.kind !== 'I64') throw new Error("net.close expects I64");
        const s = await ctx.net.close(Number(sock.value));
        if (s) return { kind: 'Result', isOk: true, value: { kind: 'Bool', value: true } };
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Close failed" } };
    }
    if (op === 'net.connect') {
        const host = args[0];
        const port = args[1];
        if (host.kind !== 'Str') throw new Error("net.connect expects Str host");
        if (port.kind !== 'I64') throw new Error("net.connect expects I64 port");
        const h = await ctx.net.connect(host.value, Number(port.value));
        if (h !== null) return { kind: 'Result', isOk: true, value: { kind: 'I64', value: BigInt(h) } };
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Connect failed" } };
    }
    throw new Error(`Unknown net op: ${op}`);
}
