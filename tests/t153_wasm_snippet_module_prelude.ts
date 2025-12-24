import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t153_wasm_snippet_module_prelude = {
  name: 't153_wasm_snippet_module_prelude',
  fn: async () => {
    console.log('Running T153: WAT snippet for module prelude...');

    const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm.iris'), 'utf8');
    const parser = new Parser(code);
    const program = parser.parse();

    const compilerRoot = path.join(__dirname, '../examples/real/compiler');
    const stdlibRoot = path.join(__dirname, '../stdlib');
    const moduleCache = new Map<string, any>();

    const resolver: ModuleResolver = (modulePath: string) => {
      if (moduleCache.has(modulePath)) return moduleCache.get(modulePath);

      const candidates = [
        path.join(compilerRoot, `${modulePath}.iris`),
        path.join(stdlibRoot, `${modulePath}.iris`)
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const source = fs.readFileSync(candidate, 'utf8');
          const parsed = new Parser(source).parse();
          moduleCache.set(modulePath, parsed);
          return parsed;
        }
      }

      return undefined;
    };

    const checker = new TypeChecker(resolver);
    checker.check(program);

    const interpreter = new Interpreter(program, {}, resolver);

    const valStr = (s: string) => ({ kind: 'Str', value: s });
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);
    const valList = (items: any[]) => ({ kind: 'List', items } as any);
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);

    const prog = valRecord({
      progMod: valRecord({ name: valStr('m'), version: valI64(0n) }),
      progImports: valList([]),
      progDefs: valList([])
    });

    const res = await interpreter.callFunction('codegen_module', [prog]);

    const expected = [
      '(module',
      '(type $print_type (func (param i64) (result i64)))',
      '(type $parse_i64_type (func (param i64) (result i64)))',
      '(type $rand_type (func (result i64)))',
      '(type $args_list_type (func (result i64)))',
      '(type $i64_to_string_type (func (param i64) (result i64)))',
      '(type $str_concat_type (func (param i64) (param i64) (result i64)))',
      '(type $str_eq_type (func (param i64) (param i64) (result i64)))',
      '(type $record_get_type (func (param i64) (param i64) (result i64)))',
      '(import "host" "print" (func $host.print (type $print_type)))',
      '(import "host" "parse_i64" (func $host.parse_i64 (type $parse_i64_type)))',
      '(import "host" "rand_u64" (func $host.rand_u64 (type $rand_type)))',
      '(import "host" "args_list" (func $host.args_list (type $args_list_type)))',
      '(import "host" "i64_to_string" (func $host.i64_to_string (type $i64_to_string_type)))',
      '(import "host" "str_concat" (func $host.str_concat (type $str_concat_type)))',
      '(import "host" "str_eq" (func $host.str_eq (type $str_eq_type)))',
      '(import "host" "record_get" (func $host.record_get (type $record_get_type)))',
      '(memory $memory 1)',
      '(export "memory" (memory $memory))',
      '(func $alloc (export "alloc") (param $size i64) (result i64)',
      '  (local $ptr i64)',
      '  (local.set $ptr (i64.extend_i32_u (i32.load (i32.const 0))))',
      '  (if (i64.eqz (local.get $ptr)) (then (local.set $ptr (i64.const 4))))',
      '  (i32.store (i32.const 0) (i32.add (i32.wrap_i64 (local.get $ptr)) (i32.wrap_i64 (local.get $size))))',
      '  (local.get $ptr)',
      ')',
      '',
      ')',
      ''
    ].join('\n');

    assertEx(res, expected);
    console.log('T153 Passed: module prelude snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
