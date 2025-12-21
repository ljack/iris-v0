
import { Value, IntrinsicOp } from '../../types';

const MOCK_OK_URL = "http://example.com";
const MOCK_FAIL_URL = "http://invalid-url-that-fails.test";

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

    if (op === 'http.get' || op === 'http.post') {
        return {
            kind: 'Result',
            isOk: false,
            value: { kind: 'Str', value: "http.get requires async runtime" },
        };
    }

    throw new Error(`Unknown http op: ${op}`);
}

export async function evalHttpAsync(op: IntrinsicOp, args: Value[]): Promise<Value> {
    if (op === 'http.get') {
        const raw = args[0];
        if (raw.kind !== 'Str') throw new Error("http.get expects Str");
        return runHttpFetch(raw.value, "GET");
    }

    if (op === 'http.post') {
        const raw = args[0];
        const body = args[1];
        if (raw.kind !== 'Str' || body.kind !== 'Str') {
            throw new Error("http.post expects Str url and Str body");
        }
        return runHttpFetch(raw.value, "POST", body.value);
    }

    return evalHttp(op, args);
}

async function runHttpFetch(
    url: string,
    method: "GET" | "POST",
    body?: string,
): Promise<Value> {
    if (url === MOCK_FAIL_URL) {
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Fetch failed" } };
    }

    if (url === MOCK_OK_URL) {
        return { kind: 'Result', isOk: true, value: buildHttpResponseValue("HTTP/1.1", 200, [], "OK") };
    }

    const fetchFn = (globalThis as any).fetch as
        | ((input: string, init?: { method?: string; body?: string }) => Promise<any>)
        | undefined;
    if (!fetchFn) {
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Fetch not available" } };
    }

    try {
        const res = await fetchFn(url, {
            method,
            body,
        });
        const text = await res.text();
        const headers: Array<{ key: string; val: string }> = [];
        if (res.headers && typeof res.headers.forEach === "function") {
            res.headers.forEach((val: string, key: string) => headers.push({ key, val }));
        }
        return {
            kind: 'Result',
            isOk: true,
            value: buildHttpResponseValue("HTTP/1.1", res.status, headers, text),
        };
    } catch {
        return { kind: 'Result', isOk: false, value: { kind: 'Str', value: "Fetch failed" } };
    }
}

function buildHttpResponseValue(
    version: string,
    status: number,
    headers: Array<{ key: string; val: string }>,
    body: string,
): Value {
    const headerValues: Value[] = headers.map((h) => ({
        kind: 'Record',
        fields: {
            key: { kind: 'Str', value: h.key },
            val: { kind: 'Str', value: h.val },
        },
    }));
    return {
        kind: 'Record',
        fields: {
            version: { kind: 'Str', value: version },
            status: { kind: 'I64', value: BigInt(status) },
            headers: { kind: 'List', items: headerValues },
            body: { kind: 'Str', value: body },
        },
    };
}
