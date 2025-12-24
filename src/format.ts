import { Capability, Definition, Expr, IrisEffect, IrisType, MatchCase, Program, Value } from './types';
import { printValue } from './sexp/printer';

const INDENT = 2;
const SYMBOL_NAME = /^[A-Za-z_!?\\.-][A-Za-z0-9_!?\\.-]*$/;

export type FormatOptions = {
  preserveSugar?: boolean;
};

function indent(level: number): string {
  return ' '.repeat(level * INDENT);
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

export function formatProgram(program: Program, options: FormatOptions = {}): string {
  const lines: string[] = [];
  lines.push('(program');
  lines.push(`${indent(1)}(module`);
  lines.push(`${indent(2)}(name "${escapeStr(program.module.name)}")`);
  lines.push(`${indent(2)}(version ${program.module.version})`);
  lines.push(`${indent(1)})`);

  if (program.imports.length > 0) {
    lines.push(`${indent(1)}(imports`);
    for (const entry of program.imports) {
      lines.push(
        `${indent(2)}(import "${escapeStr(entry.path)}" (as "${escapeStr(entry.alias)}"))`,
      );
    }
    lines.push(`${indent(1)})`);
  }

  lines.push(`${indent(1)}(defs`);
  for (const def of program.defs) {
    lines.push(...formatDefinition(def, 2, options));
  }
  lines.push(`${indent(1)})`);
  lines.push(')');

  return lines.join('\n');
}

export function viewProgram(program: Program): string {
  const lines: string[] = [];
  lines.push('program');
  lines.push(`${indent(1)}module name="${program.module.name}" version=${program.module.version}`);

  if (program.imports.length > 0) {
    lines.push(`${indent(1)}imports`);
    for (const entry of program.imports) {
      lines.push(`${indent(2)}- ${entry.path} as ${entry.alias}`);
    }
  }

  lines.push(`${indent(1)}defs`);
  for (const def of program.defs) {
    lines.push(...viewDefinition(def, 2));
  }

  return lines.join('\n');
}

function formatDefinition(def: Definition, level: number, options: FormatOptions): string[] {
  const lines: string[] = [];
  if (def.kind === 'DefConst') {
    lines.push(`${indent(level)}(defconst`);
    lines.push(`${indent(level + 1)}(name ${def.name})`);
    lines.push(`${indent(level + 1)}(type ${formatType(def.type)})`);
    if (def.doc) {
      lines.push(`${indent(level + 1)}(doc "${escapeStr(def.doc)}")`);
    }
    lines.push(`${indent(level + 1)}(value ${formatExprInline(def.value, options)})`);
    lines.push(`${indent(level)})`);
    return lines;
  }
  if (def.kind === 'TypeDef') {
    lines.push(`${indent(level)}(type ${def.name} ${formatType(def.type)})`);
    if (def.doc) {
      lines.splice(1, 0, `${indent(level + 1)}(doc "${escapeStr(def.doc)}")`);
    }
    return lines;
  }

  const tag = def.kind === 'DefFn' ? 'deffn' : 'deftool';
  lines.push(`${indent(level)}(${tag}`);
  lines.push(`${indent(level + 1)}(name ${def.name})`);
  lines.push(`${indent(level + 1)}(args${formatArgs(def.args)})`);
  lines.push(`${indent(level + 1)}(ret ${formatType(def.ret)})`);
  lines.push(`${indent(level + 1)}(eff ${def.eff})`);
  pushMeta(lines, def, level + 1);
  if (def.kind === 'DefFn') {
    lines.push(`${indent(level + 1)}(body`);
    lines.push(...formatExpr(def.body, level + 2, options));
    lines.push(`${indent(level + 1)})`);
  }
  lines.push(`${indent(level)})`);
  return lines;
}

function viewDefinition(def: Definition, level: number): string[] {
  const lines: string[] = [];
  if (def.kind === 'DefConst') {
    lines.push(`${indent(level)}const ${def.name}: ${viewType(def.type)}`);
    if (def.doc) lines.push(`${indent(level + 1)}doc: "${def.doc}"`);
    lines.push(`${indent(level + 1)}value: ${viewExprInline(def.value)}`);
    return lines;
  }
  if (def.kind === 'TypeDef') {
    lines.push(`${indent(level)}type ${def.name} = ${viewType(def.type)}`);
    if (def.doc) lines.push(`${indent(level + 1)}doc: "${def.doc}"`);
    return lines;
  }

  const label = def.kind === 'DefFn' ? 'defn' : 'deftool';
  lines.push(`${indent(level)}${label} ${def.name}`);
  lines.push(`${indent(level + 1)}args: ${viewArgs(def.args)}`);
  lines.push(`${indent(level + 1)}ret: ${viewType(def.ret)}`);
  lines.push(`${indent(level + 1)}eff: ${def.eff}`);
  if (def.doc) lines.push(`${indent(level + 1)}doc: "${def.doc}"`);
  if (def.requires) lines.push(`${indent(level + 1)}requires: "${def.requires}"`);
  if (def.ensures) lines.push(`${indent(level + 1)}ensures: "${def.ensures}"`);
  if (def.caps && def.caps.length > 0) {
    lines.push(`${indent(level + 1)}caps:`);
    for (const cap of def.caps) {
      lines.push(`${indent(level + 2)}- ${cap.name}: ${viewType(cap.type)}`);
    }
  }
  if (def.kind === 'DefFn') {
    lines.push(`${indent(level + 1)}body:`);
    lines.push(...viewExpr(def.body, level + 2));
  }
  return lines;
}

function pushMeta(lines: string[], def: { doc?: string; requires?: string; ensures?: string; caps?: Capability[] }, level: number) {
  if (def.doc) lines.push(`${indent(level)}(doc "${escapeStr(def.doc)}")`);
  if (def.requires) lines.push(`${indent(level)}(requires "${escapeStr(def.requires)}")`);
  if (def.ensures) lines.push(`${indent(level)}(ensures "${escapeStr(def.ensures)}")`);
  if (def.caps && def.caps.length > 0) {
    lines.push(`${indent(level)}(caps`);
    for (const cap of def.caps) {
      lines.push(`${indent(level + 1)}(${cap.name} ${formatType(cap.type)})`);
    }
    lines.push(`${indent(level)})`);
  }
}

function formatArgs(args: { name: string; type: IrisType }[]): string {
  if (args.length === 0) return '';
  return ` ${args.map(arg => `(${arg.name} ${formatType(arg.type)})`).join(' ')}`;
}

function viewArgs(args: { name: string; type: IrisType }[]): string {
  if (args.length === 0) return '()';
  return `(${args.map(arg => `${arg.name}: ${viewType(arg.type)}`).join(', ')})`;
}

function formatType(t: IrisType): string {
  switch (t.type) {
    case 'I64':
    case 'Bool':
    case 'Str':
      return t.type;
    case 'Option':
      return `(Option ${formatType(t.inner)})`;
    case 'Result':
      return `(Result ${formatType(t.ok)} ${formatType(t.err)})`;
    case 'List':
      return `(List ${formatType(t.inner)})`;
    case 'Tuple':
      return `(Tuple ${t.items.map(formatType).join(' ')})`;
    case 'Map':
      return `(Map ${formatType(t.key)} ${formatType(t.value)})`;
    case 'Record': {
      const keys = Object.keys(t.fields).sort();
      const content = keys.map(k => `(${k} ${formatType(t.fields[k])})`).join(' ');
      return `(Record${content ? ' ' + content : ''})`;
    }
    case 'Union': {
      const keys = Object.keys(t.variants).sort();
      const content = keys.map(k => `(tag "${escapeStr(k)}" ${formatType(t.variants[k])})`).join(' ');
      return `(Union${content ? ' ' + content : ''})`;
    }
    case 'Fn':
      return `(Fn (${t.args.map(formatType).join(' ')}) ${formatType(t.ret)} ${t.eff})`;
    case 'Named':
      return t.name;
  }
}

function viewType(t: IrisType): string {
  switch (t.type) {
    case 'I64':
    case 'Bool':
    case 'Str':
      return t.type;
    case 'Option':
      return `Option<${viewType(t.inner)}>`;
    case 'Result':
      return `Result<${viewType(t.ok)}, ${viewType(t.err)}>`;
    case 'List':
      return `List<${viewType(t.inner)}>`;
    case 'Tuple':
      return `Tuple[${t.items.map(viewType).join(', ')}]`;
    case 'Map':
      return `Map<${viewType(t.key)}, ${viewType(t.value)}>`;
    case 'Record': {
      const keys = Object.keys(t.fields).sort();
      const content = keys.map(k => `${k}: ${viewType(t.fields[k])}`).join(', ');
      return `Record{${content}}`;
    }
    case 'Union': {
      const keys = Object.keys(t.variants).sort();
      const content = keys.map(k => `${k}: ${viewType(t.variants[k])}`).join(', ');
      return `Union{${content}}`;
    }
    case 'Fn':
      return `Fn(${t.args.map(viewType).join(', ')}) -> ${viewType(t.ret)} ${t.eff}`;
    case 'Named':
      return t.name;
  }
}

function formatExprInline(expr: Expr, options: FormatOptions): string {
  if (options.preserveSugar) {
    const update = collectRecordUpdate(expr);
    if (update) {
      return formatRecordUpdateInline(update.target, update.updates, options);
    }
  }
  switch (expr.kind) {
    case 'Literal':
      return formatLiteral(expr.value);
    case 'Var':
      return expr.name;
    case 'Call':
      return `(${expr.fn}${expr.args.length ? ' ' + expr.args.map(arg => formatExprInline(arg, options)).join(' ') : ''})`;
    case 'Intrinsic':
      return `(${expr.op}${expr.args.length ? ' ' + expr.args.map(arg => formatExprInline(arg, options)).join(' ') : ''})`;
    case 'List': {
      const head = expr.typeArg ? `list-of ${formatType(expr.typeArg)}` : 'list';
      return `(${head}${expr.items.length ? ' ' + expr.items.map(arg => formatExprInline(arg, options)).join(' ') : ''})`;
    }
    case 'Tuple':
      return `(tuple${expr.items.length ? ' ' + expr.items.map(arg => formatExprInline(arg, options)).join(' ') : ''})`;
    case 'Record':
      return formatRecordInline(expr.fields);
    case 'Tagged':
      return formatTaggedInline(expr);
    case 'Let':
      return `(let (${expr.name} ${formatExprInline(expr.value, options)}) ${formatExprInline(expr.body, options)})`;
    case 'If':
      return `(if ${formatExprInline(expr.cond, options)} ${formatExprInline(expr.then, options)} ${formatExprInline(expr.else, options)})`;
    case 'Match':
      return `(match ${formatExprInline(expr.target, options)} ${expr.cases.map(kase => formatMatchCaseInline(kase, options)).join(' ')})`;
    case 'Do':
      return `(do ${expr.exprs.map(item => formatExprInline(item, options)).join(' ')})`;
    case 'Lambda':
      return formatLambdaInline(expr, options);
    case 'Fold':
      return `(fold ${formatExprInline(expr.list, options)} ${formatExprInline(expr.init, options)} ${formatExprInline(expr.fn, options)})`;
  }
}

function formatExpr(expr: Expr, level: number, options: FormatOptions): string[] {
  if (options.preserveSugar) {
    const letStar = collectLetStar(expr);
    if (letStar) {
      const lines: string[] = [];
      lines.push(`${indent(level)}(let* (${letStar.bindings.map(binding => `(${binding.name} ${formatExprInline(binding.value, options)})`).join(' ')})`);
      lines.push(...formatExpr(letStar.body, level + 1, options));
      lines.push(`${indent(level)})`);
      return lines;
    }
    const condChain = collectCond(expr);
    if (condChain) {
      const lines: string[] = [];
      lines.push(`${indent(level)}(cond`);
      for (const entry of condChain.cases) {
        lines.push(`${indent(level + 1)}(case ${formatExprInline(entry.cond, options)} ${formatExprInline(entry.body, options)})`);
      }
      lines.push(`${indent(level + 1)}(else ${formatExprInline(condChain.elseExpr, options)})`);
      lines.push(`${indent(level)})`);
      return lines;
    }
    const recordUpdate = collectRecordUpdate(expr);
    if (recordUpdate) {
      return [
        `${indent(level)}${formatRecordUpdateInline(recordUpdate.target, recordUpdate.updates, options)}`,
      ];
    }
  }

  switch (expr.kind) {
    case 'Let': {
      const lines: string[] = [];
      lines.push(`${indent(level)}(let (${expr.name} ${formatExprInline(expr.value, options)})`);
      lines.push(...formatExpr(expr.body, level + 1, options));
      lines.push(`${indent(level)})`);
      return lines;
    }
    case 'If': {
      const lines: string[] = [];
      lines.push(`${indent(level)}(if ${formatExprInline(expr.cond, options)}`);
      lines.push(...formatExpr(expr.then, level + 1, options));
      lines.push(...formatExpr(expr.else, level + 1, options));
      lines.push(`${indent(level)})`);
      return lines;
    }
    case 'Match': {
      const lines: string[] = [];
      lines.push(`${indent(level)}(match ${formatExprInline(expr.target, options)}`);
      for (const kase of expr.cases) {
        lines.push(...formatMatchCase(kase, level + 1, options));
      }
      lines.push(`${indent(level)})`);
      return lines;
    }
    case 'Do': {
      const lines: string[] = [];
      lines.push(`${indent(level)}(do`);
      for (const entry of expr.exprs) {
        lines.push(...formatExpr(entry, level + 1, options));
      }
      lines.push(`${indent(level)})`);
      return lines;
    }
    case 'Lambda': {
      const lines: string[] = [];
      lines.push(`${indent(level)}(lambda`);
      lines.push(`${indent(level + 1)}(args${formatArgs(expr.args)}`);
      lines.push(`${indent(level + 1)}(ret ${formatType(expr.ret)})`);
      lines.push(`${indent(level + 1)}(eff ${expr.eff})`);
      lines.push(`${indent(level + 1)}(body`);
      lines.push(...formatExpr(expr.body, level + 2, options));
      lines.push(`${indent(level + 1)})`);
      lines.push(`${indent(level)})`);
      return lines;
    }
    default:
      return [`${indent(level)}${formatExprInline(expr, options)}`];
  }
}

function formatMatchCaseInline(kase: MatchCase, options: FormatOptions): string {
  const vars = viewVars(kase.vars);
  const varsSection = vars.length > 0 ? ` (${vars.join(' ')})` : '';
  return `(case (tag "${escapeStr(kase.tag)}"${varsSection}) ${formatExprInline(kase.body, options)})`;
}

function formatMatchCase(kase: MatchCase, level: number, options: FormatOptions): string[] {
  const vars = viewVars(kase.vars);
  const varsSection = vars.length > 0 ? ` (${vars.join(' ')})` : '';
  const header = `${indent(level)}(case (tag "${escapeStr(kase.tag)}"${varsSection})`;
  const bodyLines = formatExpr(kase.body, level + 1, options);
  if (bodyLines.length === 1) {
    return [`${header} ${bodyLines[0].trim()})`];
  }
  return [header, ...bodyLines, `${indent(level)})`];
}

function formatRecordInline(fields: Expr[]): string {
  if (fields.length === 0) return '(record)';
  const parts = fields.map(field => {
    if (field.kind === 'Tuple' && field.items.length === 2) {
      const keyExpr = field.items[0];
      if (keyExpr.kind === 'Literal' && keyExpr.value.kind === 'Str') {
        return `(${keyExpr.value.value} ${formatExprInline(field.items[1], { preserveSugar: false })})`;
      }
    }
    return formatExprInline(field, { preserveSugar: false });
  });
  return `(record ${parts.join(' ')})`;
}

function formatTaggedInline(expr: Expr & { kind: 'Tagged' }): string {
  if (expr.value.kind === 'Tuple' && expr.value.items.length === 0) {
    return `(tag "${escapeStr(expr.tag)}")`;
  }
  return `(tag "${escapeStr(expr.tag)}" ${formatExprInline(expr.value, { preserveSugar: false })})`;
}

function formatLambdaInline(expr: Expr & { kind: 'Lambda' }, options: FormatOptions): string {
  const args = expr.args.map(arg => `(${arg.name} ${formatType(arg.type)})`).join(' ');
  return `(lambda (args${args ? ' ' + args : ''}) (ret ${formatType(expr.ret)}) (eff ${expr.eff}) (body ${formatExprInline(expr.body, options)}))`;
}

function collectLetStar(expr: Expr): { bindings: { name: string; value: Expr }[]; body: Expr } | null {
  if (expr.kind !== 'Let') return null;
  const bindings: { name: string; value: Expr }[] = [];
  let current: Expr = expr;
  while (current.kind === 'Let') {
    bindings.push({ name: current.name, value: current.value });
    current = current.body;
  }
  if (bindings.length < 2) return null;
  return { bindings, body: current };
}

function collectCond(expr: Expr): { cases: { cond: Expr; body: Expr }[]; elseExpr: Expr } | null {
  if (expr.kind !== 'If') return null;
  const cases: { cond: Expr; body: Expr }[] = [];
  let current: Expr = expr;
  while (current.kind === 'If') {
    cases.push({ cond: current.cond, body: current.then });
    current = current.else;
  }
  if (cases.length === 0) return null;
  return { cases, elseExpr: current };
}

function collectRecordUpdate(expr: Expr): { target: Expr; updates: { key: string; value: Expr }[] } | null {
  if (expr.kind !== 'Intrinsic' || expr.op !== 'record.set') return null;
  const updates: { key: string; value: Expr }[] = [];
  let current: Expr = expr;
  let target: Expr | null = null;
  while (current.kind === 'Intrinsic' && current.op === 'record.set') {
    const targetExpr: Expr = current.args[0];
    const keyExpr: Expr | undefined = current.args[1];
    const valueExpr: Expr | undefined = current.args[2];
    if (!keyExpr || keyExpr.kind !== 'Literal' || keyExpr.value.kind !== 'Str') {
      return null;
    }
    const key = keyExpr.value.value;
    if (!SYMBOL_NAME.test(key)) {
      return null;
    }
    updates.push({ key, value: valueExpr });
    target = targetExpr;
    current = targetExpr;
  }
  updates.reverse();
  if (!target) return null;
  return { target, updates };
}

function formatRecordUpdateInline(
  target: Expr,
  updates: { key: string; value: Expr }[],
  options: FormatOptions,
): string {
  const parts = updates.map(update => `(${update.key} ${formatExprInline(update.value, options)})`);
  return `(record.update ${formatExprInline(target, options)}${parts.length ? ' ' + parts.join(' ') : ''})`;
}

function formatLiteral(value: Value): string {
  if (value.kind === 'List' && value.items.length === 0) {
    return 'nil';
  }
  return printValue(value);
}

function viewVars(vars: Value): string[] {
  if (vars.kind !== 'List') return [];
  return vars.items.flatMap(v => (v.kind === 'Str' ? [v.value] : []));
}

function viewExprInline(expr: Expr): string {
  switch (expr.kind) {
    case 'Literal':
      return viewValue(expr.value);
    case 'Var':
      return expr.name;
    case 'Call':
      return `call ${expr.fn}${expr.args.length ? ' ' + expr.args.map(viewExprInline).join(' ') : ''}`;
    case 'Intrinsic':
      return `${expr.op}${expr.args.length ? ' ' + expr.args.map(viewExprInline).join(' ') : ''}`;
    case 'List':
      return `list[${expr.items.map(viewExprInline).join(', ')}]`;
    case 'Tuple':
      return `tuple[${expr.items.map(viewExprInline).join(', ')}]`;
    case 'Record':
      return `record{${expr.fields.map(viewRecordFieldInline).join(', ')}}`;
    case 'Tagged':
      return expr.value.kind === 'Tuple' && expr.value.items.length === 0
        ? `tag ${expr.tag}`
        : `tag ${expr.tag} ${viewExprInline(expr.value)}`;
    case 'Let':
      return `let ${expr.name} = ${viewExprInline(expr.value)} in ${viewExprInline(expr.body)}`;
    case 'If':
      return `if ${viewExprInline(expr.cond)} then ${viewExprInline(expr.then)} else ${viewExprInline(expr.else)}`;
    case 'Match':
      return `match ${viewExprInline(expr.target)}`;
    case 'Do':
      return `do ${expr.exprs.map(viewExprInline).join('; ')}`;
    case 'Lambda':
      return `lambda(${expr.args.map(a => `${a.name}: ${viewType(a.type)}`).join(', ')})`;
    case 'Fold':
      return `fold ${viewExprInline(expr.list)} ${viewExprInline(expr.init)} ${viewExprInline(expr.fn)}`;
  }
}

function viewExpr(expr: Expr, level: number): string[] {
  switch (expr.kind) {
    case 'Let': {
      const lines: string[] = [];
      lines.push(`${indent(level)}let ${expr.name} = ${viewExprInline(expr.value)}`);
      lines.push(`${indent(level)}in`);
      lines.push(...viewExpr(expr.body, level + 1));
      return lines;
    }
    case 'If': {
      const lines: string[] = [];
      lines.push(`${indent(level)}if ${viewExprInline(expr.cond)}`);
      lines.push(`${indent(level)}then`);
      lines.push(...viewExpr(expr.then, level + 1));
      lines.push(`${indent(level)}else`);
      lines.push(...viewExpr(expr.else, level + 1));
      return lines;
    }
    case 'Match': {
      const lines: string[] = [];
      lines.push(`${indent(level)}match ${viewExprInline(expr.target)}`);
      for (const kase of expr.cases) {
        const vars = viewVars(kase.vars);
        const varsText = vars.length > 0 ? ` (${vars.join(', ')})` : '';
        lines.push(`${indent(level + 1)}case tag "${kase.tag}"${varsText}`);
        lines.push(...viewExpr(kase.body, level + 2));
      }
      return lines;
    }
    case 'Do': {
      const lines: string[] = [];
      lines.push(`${indent(level)}do`);
      for (const entry of expr.exprs) {
        lines.push(...viewExpr(entry, level + 1));
      }
      return lines;
    }
    case 'Lambda': {
      const lines: string[] = [];
      lines.push(`${indent(level)}lambda`);
      lines.push(`${indent(level + 1)}args: ${viewArgs(expr.args)}`);
      lines.push(`${indent(level + 1)}ret: ${viewType(expr.ret)}`);
      lines.push(`${indent(level + 1)}eff: ${expr.eff}`);
      lines.push(`${indent(level + 1)}body:`);
      lines.push(...viewExpr(expr.body, level + 2));
      return lines;
    }
    default:
      return [`${indent(level)}${viewExprInline(expr)}`];
  }
}

function viewRecordFieldInline(field: Expr): string {
  if (field.kind === 'Tuple' && field.items.length === 2) {
    const keyExpr = field.items[0];
    if (keyExpr.kind === 'Literal' && keyExpr.value.kind === 'Str') {
      return `${keyExpr.value.value}: ${viewExprInline(field.items[1])}`;
    }
  }
  return viewExprInline(field);
}

function viewValue(v: Value): string {
  switch (v.kind) {
    case 'I64':
      return v.value.toString();
    case 'Bool':
      return v.value ? 'true' : 'false';
    case 'Str':
      return `"${v.value}"`;
    case 'Option':
      return v.value === null ? 'None' : `Some ${viewValue(v.value)}`;
    case 'Result':
      return v.isOk ? `Ok ${viewValue(v.value)}` : `Err ${viewValue(v.value)}`;
    case 'List':
      return `[${v.items.map(viewValue).join(', ')}]`;
    case 'Tuple':
      return `tuple[${v.items.map(viewValue).join(', ')}]`;
    case 'Record': {
      const keys = Object.keys(v.fields).sort();
      const content = keys.map(k => `${k}: ${viewValue(v.fields[k])}`).join(', ');
      return `{${content}}`;
    }
    case 'Tagged':
      return `tag ${v.tag} ${viewValue(v.value)}`;
    case 'Map':
      return 'map{}';
    case 'Lambda':
      return 'lambda';
  }
  return 'unknown';
}
