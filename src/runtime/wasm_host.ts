import { ToolRegistry } from './tool-host';

export type WasmMemory = WebAssembly.Memory | null;

export interface WasmHostOptions {
    tools?: ToolRegistry;
    onPrint?: (text: string) => void;
}

export class IrisWasmHost {
    private memory: WasmMemory = null;
    private tools: ToolRegistry;
    private onPrint: (text: string) => void;

    constructor(options: WasmHostOptions = {}) {
        this.tools = options.tools || {};
        this.onPrint = options.onPrint || ((text) => console.log(text));
    }

    attachMemory(memory: WebAssembly.Memory) {
        this.memory = memory;
    }

    getImportObject() {
        return {
            host: {
                print: (ptr: bigint) => this.print(ptr),
                rand_u64: () => this.randU64(),
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
        const hi = Math.floor(Math.random() * 0x100000000);
        const lo = Math.floor(Math.random() * 0x100000000);
        return (BigInt(hi) << 32n) | BigInt(lo);
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
        const p = this.findFree(total, buf);
        const view = new DataView(this.memory.buffer);
        view.setBigInt64(p, BigInt(bytes.length), true);
        buf.set(bytes, p + 8);
        return BigInt(p);
    }

    private findFree(size: number, buf: Uint8Array): number {
        // Simple bump allocator: use end of memory
        const p = buf.length - size;
        if (p <= 0) throw new Error('WASM host out of memory');
        return p;
    }
}
