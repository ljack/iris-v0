import { IrisWasmHost, WasmHostOptions } from './runtime/wasm_host';

export class IrisWasmRuntime {
    private host: IrisWasmHost;

    constructor(options: WasmHostOptions = {}) {
        this.host = new IrisWasmHost(options);
    }

    async run(wasmBuffer: Buffer | Uint8Array) {
        const result = await WebAssembly.instantiate(wasmBuffer, this.host.getImportObject());
        const instance = (result as any).instance || result;
        this.host.attachMemory(instance.exports.memory as WebAssembly.Memory);
        const main = instance.exports.main as Function;
        return main();
    }
}
