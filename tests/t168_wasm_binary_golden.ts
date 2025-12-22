import { emitWasmBinary, WasmModule } from '../src/wasm_binary_emitter';

export const t168_wasm_binary_golden = {
  name: 't168_wasm_binary_golden',
  fn: async () => {
    const module: WasmModule = {
      funcs: [
        {
          name: 'main',
          params: [],
          result: 'i64',
          body: [{ kind: 'i64.const', value: 42n }]
        }
      ],
      memory: { min: 1, exportName: 'memory' }
    };

    const bytes = emitWasmBinary(module);
    const hex = Buffer.from(bytes)
      .toString('hex')
      .match(/.{1,2}/g)!
      .join(' ');

    const expected = [
      '00 61 73 6d', // magic
      '01 00 00 00', // version
      '01 05 01 60 00 01 7e', // type section
      '03 02 01 00', // func section
      '05 03 01 00 01', // memory section (min=1)
      '07 11 02 04 6d 61 69 6e 00 00 06 6d 65 6d 6f 72 79 02 00', // exports
      '0a 06 01 04 00 42 2a 0b' // code
    ].join(' ');

    if (hex !== expected) {
      throw new Error(`Unexpected wasm bytes.\nExpected: ${expected}\nGot:      ${hex}`);
    }

    await WebAssembly.compile(bytes as unknown as BufferSource);
  }
};
