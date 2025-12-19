
import { Value, IntrinsicOp } from '../../types';

export function evalHttp(op: IntrinsicOp, args: Value[]): Value {
    if (op === 'http.parse_request') {
        const raw = args[0];
        if (raw.kind !== 'Str') throw new Error("http.parse_request expects Str");
        const text = raw.value;

        try {
            const parts = text.split(/\r?\n\r?\n/); // Split head and body
            const head = parts[0];
            const body = parts.slice(1).join('\n\n');

            const lines = head.split(/\r?\n/);
            if (lines.length === 0) throw new Error("Empty request");

            const reqLine = lines[0].split(' ');
            if (reqLine.length < 3) throw new Error("Invalid request line");
            const method = reqLine[0];
            const path = reqLine[1];

            const headers: Value[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                const idx = line.indexOf(':');
                if (idx !== -1) {
                    const key = line.substring(0, idx).trim();
                    const val = line.substring(idx + 1).trim();
                    headers.push({
                        kind: 'Record',
                        fields: {
                            key: { kind: 'Str', value: key },
                            val: { kind: 'Str', value: val }
                        }
                    });
                }
            }

            const reqRecord: Value = {
                kind: 'Record',
                fields: {
                    method: { kind: 'Str', value: method },
                    path: { kind: 'Str', value: path },
                    headers: { kind: 'List', items: headers },
                    body: { kind: 'Str', value: body }
                }
            };

            return { kind: 'Result', isOk: true, value: reqRecord };
        } catch (e: any) {
            return { kind: 'Result', isOk: false, value: { kind: 'Str', value: e.message } };
        }
    }

    if (op === 'http.parse_response') {
        const raw = args[0];
        if (raw.kind !== 'Str') throw new Error("http.parse_response expects Str");
        const text = raw.value;

        try {
            const parts = text.split(/\r?\n\r?\n/);
            const head = parts[0];
            const body = parts.slice(1).join('\n\n');

            const lines = head.split(/\r?\n/);
            if (lines.length === 0) throw new Error("Empty response");

            const statusLine = lines[0].split(' ');
            if (statusLine.length < 2) throw new Error("Invalid status line");
            const version = statusLine[0];
            // Handle status code, possibly with text following
            const statusCode = BigInt(parseInt(statusLine[1]));
            // The rest is status text (optional)

            const headers: Value[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                const idx = line.indexOf(':');
                if (idx !== -1) {
                    const key = line.substring(0, idx).trim();
                    const val = line.substring(idx + 1).trim();
                    headers.push({
                        kind: 'Record',
                        fields: {
                            key: { kind: 'Str', value: key },
                            val: { kind: 'Str', value: val }
                        }
                    });
                }
            }

            const resRecord: Value = {
                kind: 'Record',
                fields: {
                    version: { kind: 'Str', value: version },
                    status: { kind: 'I64', value: statusCode },
                    headers: { kind: 'List', items: headers },
                    body: { kind: 'Str', value: body }
                }
            };
            return { kind: 'Result', isOk: true, value: resRecord };
        } catch (e: any) {
            return { kind: 'Result', isOk: false, value: { kind: 'Str', value: e.message } };
        }
    }

    throw new Error(`Unknown http op: ${op}`);
}
