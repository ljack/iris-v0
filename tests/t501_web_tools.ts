import { runIris } from '../src/web-entry';
import { BrowserFileSystem, BrowserNetwork, BrowserToolHost } from '../src/platform/browser';
import { ToolRegistry, jsToValue, valueToJs } from '../src/runtime/tool-host';
import { TestCase } from '../src/test-types';
import { Value } from '../src/types';

const toolProgram = `(program
  (module (name "tool-host") (version 0))
  (defs
    (deftool (name add) (args (a I64) (b I64)) (ret I64) (eff !IO))
    (deffn (name main) (args) (ret I64) (eff !IO)
      (body (call add 2 5))
    )
  )
)`;

const pureProgram = `(program
  (module (name "tool-host-pure") (version 0))
  (defs
    (deffn (name main) (args) (ret I64) (eff !Pure)
      (body 1)
    )
  )
)`;

export const t501_web_tools: TestCase = {
  name: 't501_web_tools',
  fn: async () => {
    const addRegistry: ToolRegistry = {
      add: (a: bigint, b: bigint) => a + b
    };

    const fs = new BrowserFileSystem();
    if (fs.readFile('missing.txt') !== null) {
      throw new Error('Expected missing file to return null');
    }
    if (!fs.writeFile('notes.txt', 'hello')) {
      throw new Error('Expected writeFile to return true');
    }
    if (fs.readFile('notes.txt') !== 'hello') {
      throw new Error('Expected readFile to return stored content');
    }
    if (!fs.exists('notes.txt')) {
      throw new Error('Expected notes.txt to exist');
    }
    const dir = fs.readDir('notes');
    if (!dir || dir.length !== 1 || dir[0] !== 'notes.txt') {
      throw new Error(`Expected readDir to include notes.txt, got: ${dir}`);
    }

    const net = new BrowserNetwork();
    const server = await net.listen(8080);
    const client = await net.accept(server);
    const request = await net.read(client);
    if (!request.includes('HTTP/1.1')) {
      throw new Error('Expected mock HTTP request');
    }
    if (!await net.write(client, 'ok')) {
      throw new Error('Expected net.write to return true');
    }
    const connect = await net.connect('localhost', 80);
    if (connect !== null) {
      throw new Error('Expected net.connect to return null');
    }
    if (!await net.close(client)) {
      throw new Error('Expected net.close to return true');
    }

    const toolHost = new BrowserToolHost(addRegistry);
    const direct = await toolHost.callTool('add', [
      { kind: 'I64', value: 2n },
      { kind: 'I64', value: 5n }
    ]);
    if (direct.kind !== 'I64' || direct.value !== 7n) {
      throw new Error(`Expected tool host to return 7, got: ${JSON.stringify(direct)}`);
    }
    const directSync = toolHost.callToolSync('add', [
      { kind: 'I64', value: 1n },
      { kind: 'I64', value: 2n }
    ]);
    if (directSync.kind !== 'I64' || directSync.value !== 3n) {
      throw new Error(`Expected tool host sync to return 3, got: ${JSON.stringify(directSync)}`);
    }
    try {
      await toolHost.callTool('missing', []);
      throw new Error('Expected missing tool to throw');
    } catch (e: any) {
      if (!e.message.includes('Tool not found')) throw e;
    }
    try {
      toolHost.callToolSync('missing', []);
      throw new Error('Expected missing tool to throw (sync)');
    } catch (e: any) {
      if (!e.message.includes('Tool not found')) throw e;
    }

    const lambdaValue: Value = {
      kind: 'Lambda',
      args: [],
      ret: { type: 'I64' },
      eff: '!Pure',
      body: { kind: 'Literal', value: { kind: 'I64', value: 0n } }
    };

    const values: Value[] = [
      { kind: 'I64', value: 9n },
      { kind: 'Bool', value: true },
      { kind: 'Str', value: 'ok' },
      { kind: 'Option', value: { kind: 'I64', value: 1n } },
      { kind: 'Result', isOk: true, value: { kind: 'Str', value: 'yes' } },
      { kind: 'Result', isOk: false, value: { kind: 'Str', value: 'no' } },
      { kind: 'List', items: [{ kind: 'Str', value: 'a' }] },
      { kind: 'Tuple', items: [{ kind: 'I64', value: 2n }] },
      { kind: 'Record', fields: { a: { kind: 'Bool', value: false } } },
      { kind: 'Tagged', tag: 'Tag', value: { kind: 'Bool', value: true } },
      { kind: 'Map', value: new Map() },
      lambdaValue
    ];

    for (const v of values) {
      valueToJs(v);
    }
    valueToJs({ kind: 'Unknown' } as unknown as Value);

    const passthrough = jsToValue({ kind: 'Bool', value: true });
    if (passthrough.kind !== 'Bool' || passthrough.value !== true) {
      throw new Error('Expected jsToValue to passthrough Value');
    }
    if (jsToValue(2n).kind !== 'I64') throw new Error('Expected bigint to map to I64');
    if (jsToValue(3).kind !== 'I64') throw new Error('Expected number to map to I64');
    if (jsToValue('str').kind !== 'Str') throw new Error('Expected string to map to Str');
    if (jsToValue(false).kind !== 'Bool') throw new Error('Expected boolean to map to Bool');
    if (jsToValue(null).kind !== 'Option') throw new Error('Expected null to map to Option');
    if (jsToValue([1, 2]).kind !== 'List') throw new Error('Expected array to map to List');
    if (jsToValue({ a: 1 }).kind !== 'Record') throw new Error('Expected object to map to Record');
    if (jsToValue(Symbol('x') as any).kind !== 'Str') {
      throw new Error('Expected fallback to map to Str');
    }

    const outputNoTools = await runIris(pureProgram);
    if (!outputNoTools.includes('=> 1')) {
      throw new Error(`Expected pure run output to include '=> 1', got: ${outputNoTools}`);
    }

    const outputRegistry = await runIris(toolProgram, addRegistry);
    if (!outputRegistry.includes('=> 7')) {
      throw new Error(`Expected registry output to include '=> 7', got: ${outputRegistry}`);
    }

    const outputHost = await runIris(toolProgram, new BrowserToolHost(addRegistry));
    if (!outputHost.includes('=> 7')) {
      throw new Error(`Expected tool host output to include '=> 7', got: ${outputHost}`);
    }

    const prevWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {};
      const outputWindowNone = await runIris(pureProgram);
      if (!outputWindowNone.includes('=> 1')) {
        throw new Error(`Expected window no-tools output to include '=> 1', got: ${outputWindowNone}`);
      }

      (globalThis as any).window = {
        irisToolHost: new BrowserToolHost(addRegistry)
      };
      const outputWindowHost = await runIris(toolProgram);
      if (!outputWindowHost.includes('=> 7')) {
        throw new Error(`Expected window tool host output to include '=> 7', got: ${outputWindowHost}`);
      }

      (globalThis as any).window = {
        irisTools: addRegistry
      };
      const outputWindowRegistry = await runIris(toolProgram);
      if (!outputWindowRegistry.includes('=> 7')) {
        throw new Error(`Expected window registry output to include '=> 7', got: ${outputWindowRegistry}`);
      }

      const outputTypeError = await runIris(`(program
        (module (name "bad") (version 0))
        (defs
          (deffn (name main) (args) (ret I64) (eff !Pure)
            (body true)
          )
        )
      )`);
      if (!outputTypeError.includes('TypeError:')) {
        throw new Error(`Expected type error output, got: ${outputTypeError}`);
      }

      const printProgram = `(program
        (module (name "print") (version 0))
        (defs
          (deffn (name main) (args) (ret I64) (eff !IO)
            (body (let (_ (io.print "boom")) 0))
          )
        )
      )`;
      const outputPrint = await runIris(printProgram);
      if (!outputPrint.includes('boom')) {
        throw new Error(`Expected print output to include "boom", got: ${outputPrint}`);
      }

      const badTools = {
        get callTool() {
          throw new Error('tool getter failure');
        }
      };
      const outputUnexpected = await runIris(pureProgram, badTools as ToolRegistry);
      if (!outputUnexpected.includes('Unexpected Error: tool getter failure')) {
        throw new Error(`Expected unexpected error output, got: ${outputUnexpected}`);
      }

      const modulePath = require.resolve('../src/web-entry');
      delete require.cache[modulePath];
      (globalThis as any).window = {};
      require('../src/web-entry');
      if (typeof (globalThis as any).window.runIris !== 'function') {
        throw new Error('Expected runIris to attach to window when available');
      }
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = prevWindow;
      }
    }
  }
};
