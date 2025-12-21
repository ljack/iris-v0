
import { Value, IntrinsicOp } from '../../types';
import { InterpreterContext } from '../context';
import { evalMath } from './math';
import { evalSys } from './sys';
import { evalIo } from './io';
import { evalNet } from './net';
import { evalHttp, evalHttpAsync } from './http';
import { evalConstructor } from './constructors';

import { evalData } from './data';

export async function evalIntrinsic(ctx: InterpreterContext, op: IntrinsicOp, args: Value[]): Promise<Value> {
    if (op.startsWith('sys.')) return evalSys(ctx, op, args);
    if (op.startsWith('net.')) return evalNet(ctx, op, args);
    if (op.startsWith('io.')) return evalIo(ctx, op, args);
    if (op.startsWith('http.')) {
        if (op === 'http.get' || op === 'http.post') {
            return await evalHttpAsync(op, args);
        }
        return evalHttp(op, args);
    }
    if (['Some', 'Ok', 'Err'].includes(op)) return evalConstructor(op, args);

    const dataRes = evalData(op, args);
    if (dataRes) return dataRes;

    // Default to math/pure ops
    return evalMath(op, args);
}
