import { emitWasmBinary, WasmModule } from '../src/wasm_binary_emitter';

export const t167_wasm_binary_header = {
  name: 't167_wasm_binary_header',
  fn: async () => {
    const simpleModule: WasmModule = {
      funcs: [
        {
          name: 'main',
          params: [],
          result: 'i64',
          body: [{ kind: 'i64.const', value: 0n }]
        }
      ],
      memory: { min: 1 }
    };

    const bytes = emitWasmBinary(simpleModule);

    if (bytes[0] !== 0x00 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) {
      throw new Error('Missing wasm magic header');
    }
    if (bytes[4] !== 0x01 || bytes[5] !== 0x00 || bytes[6] !== 0x00 || bytes[7] !== 0x00) {
      throw new Error('Invalid wasm version header');
    }

    // Validate section ordering and ability to compile.
    const sectionIds: number[] = [];
    let offset = 8;
    while (offset < bytes.length) {
      const id = bytes[offset];
      sectionIds.push(id);
      offset += 1;
      const [len, lenSize] = readU32(bytes, offset);
      offset += lenSize + len;
    }

    const expectedOrder = [1, 3, 5, 7, 10];
    for (let i = 0; i < expectedOrder.length; i++) {
      if (sectionIds[i] !== expectedOrder[i]) {
        throw new Error(`Expected section ${expectedOrder[i]}, saw ${sectionIds[i]}`);
      }
    }

    await WebAssembly.compile(bytes as unknown as BufferSource);
  }
};

function readU32(bytes: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let consumed = 0;
  while (true) {
    const byte = bytes[offset + consumed];
    consumed += 1;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [result >>> 0, consumed];
}
