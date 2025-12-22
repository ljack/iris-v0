import { emitWasmBinary, WasmModule } from '../src/wasm_binary_emitter';

export const t169_wasm_binary_memory_required = {
  name: 't169_wasm_binary_memory_required',
  fn: async () => {
    const module: WasmModule = {
      funcs: [
        {
          name: 'main',
          params: [],
          result: 'i64',
          body: [
            { kind: 'i64.const', value: 0n },
            { kind: 'i64.load' }
          ]
        }
      ]
    };

    try {
      emitWasmBinary(module);
      throw new Error('Expected memory requirement error');
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (!msg.includes('memory ops')) {
        throw new Error(`Unexpected error: ${msg}`);
      }
    }
  }
};
