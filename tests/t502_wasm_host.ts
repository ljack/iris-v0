import { IrisWasmHost } from '../src/runtime/wasm_host';
import { TestCase } from '../src/test-types';

function writeString(mem: WebAssembly.Memory, offset: number, text: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const view = new DataView(mem.buffer);
  view.setBigInt64(offset, BigInt(bytes.length), true);
  new Uint8Array(mem.buffer).set(bytes, offset + 8);
}

function readString(mem: WebAssembly.Memory, offset: number) {
  const view = new DataView(mem.buffer);
  const len = Number(view.getBigInt64(offset, true));
  const bytes = new Uint8Array(mem.buffer).slice(offset + 8, offset + 8 + len);
  return new TextDecoder().decode(bytes);
}

export const t502_wasm_host: TestCase = {
  name: 't502_wasm_host',
  fn: async () => {
    const logs: string[] = [];
    const host = new IrisWasmHost({
      tools: { add: (a: number, b: number) => a + b },
      onPrint: (text) => logs.push(text)
    });
    const memory = new WebAssembly.Memory({ initial: 1 });
    host.attachMemory(memory);

    const hostImports: any = host.getImportObject().host;

    writeString(memory, 0, 'hello wasm');
    hostImports.print(0n);
    if (logs[0] !== 'hello wasm') {
      throw new Error(`Expected print to capture 'hello wasm', got: ${logs[0]}`);
    }

    writeString(memory, 64, 'add');
    writeString(memory, 128, JSON.stringify([2, 5]));
    const resultPtr = hostImports.tool_call_json(64n, 128n);
    const resultRaw = readString(memory, Number(resultPtr));
    const result = JSON.parse(resultRaw);
    if (!result.ok || result.ok !== 7) {
      throw new Error(`Expected tool call ok=7, got: ${resultRaw}`);
    }

    writeString(memory, 192, 'missing');
    writeString(memory, 256, JSON.stringify([]));
    const errPtr = hostImports.tool_call_json(192n, 256n);
    const errRaw = readString(memory, Number(errPtr));
    const err = JSON.parse(errRaw);
    if (!err.err || !String(err.err).includes('Tool not found')) {
      throw new Error(`Expected tool error, got: ${errRaw}`);
    }
  }
};
