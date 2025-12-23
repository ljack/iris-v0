#!/usr/bin/env node
const fs = require('fs');

const wasmPath = process.argv[2];
if (!wasmPath) {
  console.error('Usage: node scripts/run_wasm.js <path/to/module.wasm>');
  process.exit(1);
}

const bytes = fs.readFileSync(wasmPath);
let memory = null;

const importObj = {
  host: {
    print: (ptr) => {
      if (!memory) return 0n;
      const view = new DataView(memory.buffer);
      const base = Number(ptr);
      const len = Number(view.getBigInt64(base, true));
      const bytes = new Uint8Array(memory.buffer, base + 8, len);
      const text = new TextDecoder('utf-8').decode(bytes);
      console.log(text);
      return 0n;
    },
  },
};

WebAssembly.instantiate(bytes, importObj)
  .then(({ instance }) => {
    memory = instance.exports.memory;
    const main = instance.exports.main;
    if (typeof main !== 'function') {
      console.error('Error: wasm module does not export main.');
      process.exit(1);
    }
    const res = main();
    console.log(`main returned ${res}`);
  })
  .catch((err) => {
    console.error(`Error: ${err.message || err}`);
    process.exit(1);
  });
