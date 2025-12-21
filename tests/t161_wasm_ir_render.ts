import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t161_wasm_ir_render = {
  name: 't161_wasm_ir_render',
  fn: async () => {
    console.log('Running T161: WASM IR render to WAT...');

    const code = fs.readFileSync(
      path.join(__dirname, '../examples/real/compiler/wasm_ir_to_wat.iris'),
      'utf8'
    );
    const parser = new Parser(code);
    const program = parser.parse();

    const compilerRoot = path.join(__dirname, '../examples/real/compiler');
    const moduleCache = new Map<string, any>();

    const resolver: ModuleResolver = (modulePath: string) => {
      if (moduleCache.has(modulePath)) return moduleCache.get(modulePath);

      const candidate = path.join(compilerRoot, `${modulePath}.iris`);
      if (fs.existsSync(candidate)) {
        const source = fs.readFileSync(candidate, 'utf8');
        const parsed = new Parser(source).parse();
        moduleCache.set(modulePath, parsed);
        return parsed;
      }

      return undefined;
    };

    const checker = new TypeChecker(resolver);
    checker.check(program);

    const interpreter = new Interpreter(program, {}, resolver);

    const valStr = (value: string) => ({ kind: 'Str', value } as any);
    const valList = (items: any[]) => ({ kind: 'List', items } as any);
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);
    const valTagged = (tag: string, value: any) => ({ kind: 'Tagged', tag, value } as any);

    const argText = (text: string) => valTagged('Text', valStr(text));
    const argInstr = (op: string, args: any[]) =>
      valTagged('Instr', valRecord({ op: valStr(op), args: valList(args) }));

    const instr = (op: string, args: any[]) => valRecord({ op: valStr(op), args: valList(args) });
    const nodeInstr = (op: string, args: any[]) => valTagged('Instr', instr(op, args));
    const nodeBlock = (head: string, body: any[]) =>
      valTagged('Block', valRecord({ head: valStr(head), body: valList(body) }));

    const simple = nodeInstr('i64.const', [argText('7')]);
    const resSimple = await interpreter.callFunction('render_node', [simple]);
    assertStr(resSimple, '(i64.const 7)');

    const nested = nodeInstr('i64.add', [
      argInstr('i64.const', [argText('1')]),
      argInstr('i64.const', [argText('2')])
    ]);
    const resNested = await interpreter.callFunction('render_node', [nested]);
    assertStr(resNested, '(i64.add (i64.const 1) (i64.const 2))');

    const block = nodeBlock('then', [
      nodeInstr('i64.const', [argText('0')]),
      nodeInstr('i64.const', [argText('1')])
    ]);
    const resBlock = await interpreter.callFunction('render_node', [block]);
    assertStr(resBlock, '(then\n(i64.const 0)\n(i64.const 1)\n)');

    console.log('T161 Passed: WASM IR renders to WAT correctly.');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
