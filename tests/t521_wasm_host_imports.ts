import { IrisWasmHost } from '../src/runtime/wasm_host';

export const t521_wasm_host_imports = {
  name: 't521_wasm_host_imports',
  fn: async () => {
    console.log('Running T521: wasm host import object...');
    const host = new IrisWasmHost();
    const importObj = host.getImportObject() as { host: Record<string, unknown> };
    const expected = [
      'print',
      'parse_i64',
      'i64_to_string',
      'str_concat',
      'rand_u64',
      'args_list',
      'record_get',
      'tool_call_json'
    ];
    for (const key of expected) {
      const value = importObj.host?.[key];
      if (typeof value !== 'function') {
        throw new Error(`Expected host import "${key}" to be a function.`);
      }
    }
  }
};
