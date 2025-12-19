
import { Value, IntrinsicOp } from '../../types';

export function evalConstructor(op: IntrinsicOp, args: Value[]): Value {
    if (op === 'Some') {
        return { kind: 'Option', value: args[0] };
    }
    if (op === 'Ok') return { kind: 'Result', isOk: true, value: args[0] };
    if (op === 'Err') return { kind: 'Result', isOk: false, value: args[0] };

    throw new Error(`Unknown constructor op: ${op}`);
}
