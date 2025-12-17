import { TextDecoder } from 'util';

export class IrisWasmRuntime {
    private memory: WebAssembly.Memory | null = null;

    async run(wasmBuffer: Buffer | Uint8Array) {
        const importObject = {
            host: {
                print: (ptr: bigint) => this.hostPrint(ptr)
            }
        };

        const result = await WebAssembly.instantiate(wasmBuffer, importObject);
        const instance = (result as any).instance || result;
        this.memory = instance.exports.memory as WebAssembly.Memory;
        const main = instance.exports.main as Function;
        return main();
    }

    private hostPrint(ptr: bigint) {
        if (!this.memory) {
            console.warn("WASM print called before memory initialized");
            return;
        }
        const p = Number(ptr);
        if (p === 0) {
            console.log("null pointer");
            return;
        }

        const view = new DataView(this.memory.buffer);
        try {
            // Read Iris String Header: [Length (i64)]
            const len = Number(view.getBigInt64(p, true));

            // Read UTF-8 Bytes
            const mem = new Uint8Array(this.memory.buffer);
            const bytes = mem.slice(p + 8, p + 8 + len);
            const text = new TextDecoder().decode(bytes);
            console.log(text);
        } catch (e) {
            console.error(`WASM print error at ptr ${p}:`, e);
            // Fallback for simple numbers if they are not pointers
            console.log(`[RAW] ${ptr}`);
        }
    }
}
