import { ToolRegistry } from './tool-host';

export type WasmMemory = WebAssembly.Memory | null;

export interface WasmHostOptions {
    tools?: ToolRegistry;
    onPrint?: (text: string) => void;
    args?: string[];
}

export class IrisWasmHost {
    private memory: WasmMemory = null;
    private tools: ToolRegistry;
    private onPrint: (text: string) => void;
    private args: string[];
    private argsPtrs = new Map<number, bigint>();
    private allocCursor: number | null = null;

    constructor(options: WasmHostOptions = {}) {
        this.tools = options.tools || {};
        this.onPrint = options.onPrint || ((text) => console.log(text));
        this.args = options.args || [];
    }

    attachMemory(memory: WebAssembly.Memory) {
        this.memory = memory;
        this.allocCursor = memory.buffer.byteLength;
    }

    getImportObject() {
        return {
            host: {
                print: (ptr: bigint) => this.print(ptr),
                parse_i64: (ptr: bigint) => this.parseI64(ptr),
                i64_to_string: (value: bigint) => this.i64ToString(value),
                str_concat: (aPtr: bigint, bPtr: bigint) => this.strConcat(aPtr, bPtr),
                rand_u64: () => this.randU64(),
                args_list: () => this.argsList(),
                record_get: (recordPtr: bigint, keyPtr: bigint) => this.recordGet(recordPtr, keyPtr),
                tool_call_json: (namePtr: bigint, argsPtr: bigint) => this.toolCallJson(namePtr, argsPtr)
            }
        };
    }

    private readString(ptr: bigint): string {
        if (!this.memory) return '';
        const p = Number(ptr);
        const view = new DataView(this.memory.buffer);
        const len = Number(view.getBigInt64(p, true));
        const mem = new Uint8Array(this.memory.buffer);
        const bytes = mem.slice(p + 8, p + 8 + len);
        return new TextDecoder().decode(bytes);
    }

    private print(ptr: bigint): bigint {
        if (!this.memory) return 0n;
        const base = Number(ptr);
        if (base < 0 || base + 8 > this.memory.buffer.byteLength) {
            this.onPrint(ptr.toString());
            return 0n;
        }
        const view = new DataView(this.memory.buffer);
        const len = Number(view.getBigInt64(base, true));
        if (len < 0 || base + 8 + len > this.memory.buffer.byteLength) {
            this.onPrint(ptr.toString());
            return 0n;
        }
        const text = this.readString(ptr);
        this.onPrint(text);
        return 0n;
    }

    private randU64(): bigint {
        const hi = Math.floor(Math.random() * 0x80000000);
        const lo = Math.floor(Math.random() * 0x100000000);
        return (BigInt(hi) << 32n) | BigInt(lo);
    }

    private parseI64(ptr: bigint): bigint {
        const text = this.readString(ptr).trim();
        if (text === '') throw new Error('parse_i64: empty string');
        return BigInt(text);
    }

    private i64ToString(value: bigint): bigint {
        return this.writeString(value.toString());
    }

    private strConcat(aPtr: bigint, bPtr: bigint): bigint {
        const a = this.readString(aPtr);
        const b = this.readString(bPtr);
        return this.writeString(a + b);
    }

    private argsList(): bigint {
        if (!this.memory) return 0n;
        const len = this.args.length;
        const listPtr = this.writeAlloc(8 + len * 8);
        const view = new DataView(this.memory.buffer);
        view.setBigInt64(listPtr, BigInt(len), true);
        for (let i = 0; i < len; i++) {
            const cached = this.argsPtrs.get(i);
            const strPtr = cached ?? this.writeString(this.args[i]);
            if (!cached) this.argsPtrs.set(i, strPtr);
            view.setBigInt64(listPtr + 8 + i * 8, strPtr, true);
        }
        return BigInt(listPtr);
    }

    private recordGet(recordPtr: bigint, keyPtr: bigint): bigint {
        if (!this.memory) return 0n;
        const base = Number(recordPtr);
        const view = new DataView(this.memory.buffer);
        const len = Number(view.getBigInt64(base, true));
        const key = this.readString(keyPtr);
        for (let i = 0; i < len; i++) {
            const keyAddr = base + 8 + i * 16;
            const valAddr = base + 16 + i * 16;
            const entryKeyPtr = view.getBigInt64(keyAddr, true);
            if (this.readString(entryKeyPtr) === key) {
                return view.getBigInt64(valAddr, true);
            }
        }
        throw new Error(`record_get: missing field ${key}`);
    }


    private toolCallJson(namePtr: bigint, argsPtr: bigint): bigint {
        const name = this.readString(namePtr);
        const argsRaw = this.readString(argsPtr);
        const fn = this.tools[name];
        if (!fn) return this.writeString(JSON.stringify({ err: `Tool not found: ${name}` }));

        try {
            const args = JSON.parse(argsRaw);
            const result = fn(...(Array.isArray(args) ? args : []));
            return this.writeString(JSON.stringify({ ok: result }));
        } catch (e: any) {
            return this.writeString(JSON.stringify({ err: e?.message || String(e) }));
        }
    }

    private writeString(value: string): bigint {
        if (!this.memory) return 0n;
        const encoder = new TextEncoder();
        const bytes = encoder.encode(value);
        const total = 8 + bytes.length;
        const buf = new Uint8Array(this.memory.buffer);
        const p = this.writeAlloc(total);
        const view = new DataView(this.memory.buffer);
        view.setBigInt64(p, BigInt(bytes.length), true);
        buf.set(bytes, p + 8);
        return BigInt(p);
    }

    private writeAlloc(size: number): number {
        if (!this.memory) return 0;
        const buf = new Uint8Array(this.memory.buffer);
        const cursor = this.allocCursor ?? buf.length;
        const p = cursor - size;
        if (p <= 0) throw new Error('WASM host out of memory');
        this.allocCursor = p;
        return p;
    }
}
