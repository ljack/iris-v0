import fs from 'fs';
import path from 'path';
import { run } from '../main';
import { TestCase } from '../test-types';

type IrisValue =
  | string
  | boolean
  | number
  | IrisValue[]
  | { [key: string]: IrisValue };

type IrisTestRecord = {
  name: string;
  status: string;
  message: string;
};

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (ch === '\\' && i + 1 < input.length) {
        const next = input[i + 1];
        if (next === '"' || next === '\\' || next === 'n' || next === 't' || next === 'r') {
          current += ch + next;
          i++;
          continue;
        }
      }
      if (ch === '"') {
        current += ch;
        tokens.push(current);
        current = '';
        inString = false;
        continue;
      }
      current += ch;
      continue;
    }

    if (ch === '"') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      current = '"';
      inString = true;
      continue;
    }

    if (ch === '(' || ch === ')') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      tokens.push(ch);
      continue;
    }

    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      continue;
    }

    current += ch;
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function parseString(raw: string): string {
  const content = raw.slice(1, -1);
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\\\')
    .replace(/\\\"/g, '"');
}

function parseValue(tokens: string[]): IrisValue {
  const token = tokens.shift();
  if (!token) throw new Error('Unexpected end of tokens');
  if (token === '(') {
    const head = tokens.shift();
    if (!head) throw new Error('Unexpected end of tokens after (');
    if (head === 'list') {
      const items: IrisValue[] = [];
      while (tokens[0] !== ')') {
        items.push(parseValue(tokens));
      }
      tokens.shift();
      return items;
    }
    if (head === 'record') {
      const fields: Record<string, IrisValue> = {};
      while (tokens[0] !== ')') {
        const open = tokens.shift();
        if (open !== '(') throw new Error('Expected ( in record field');
        const fieldName = tokens.shift();
        if (!fieldName) throw new Error('Missing record field name');
        const value = parseValue(tokens);
        const close = tokens.shift();
        if (close !== ')') throw new Error('Expected ) after record field');
        fields[fieldName] = value;
      }
      tokens.shift();
      return fields;
    }
    if (head === 'tag') {
      const tagNameToken = tokens.shift();
      if (!tagNameToken) throw new Error('Missing tag name');
      const tagName = parseValue([tagNameToken]) as string;
      const payload = parseValue(tokens);
      const closing = tokens.shift();
      if (closing !== ')') throw new Error('Unclosed tag expression');
      return { tag: tagName, value: payload } as any;
    }
    throw new Error(`Unsupported head ${head}`);
  }
  if (token === ')') {
    throw new Error('Unexpected )');
  }
  if (token === 'true') return true;
  if (token === 'false') return false;
  if (token.startsWith('"')) return parseString(token);
  const asNum = Number(token);
  if (!Number.isNaN(asNum)) return asNum;
  return token;
}

function parseResult(output: string): IrisTestRecord[] {
  const tokens = tokenize(output.trim());
  const value = parseValue(tokens);
  if (tokens.length !== 0) throw new Error('Extra tokens remaining after parse');
  if (!Array.isArray(value)) throw new Error('Expected list of assertion results');
  return value.map(v => {
    if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
      const record = v as Record<string, IrisValue>;
      const name = record['name'];
      const status = record['status'];
      const message = record['message'];
      if (typeof name === 'string' && typeof status === 'string' && typeof message === 'string') {
        return { name, status, message } as IrisTestRecord;
      }
    }
    throw new Error('Invalid assertion record structure');
  });
}

function loadStdlibModules(): Record<string, string> {
  const stdlibDir = path.join(__dirname, '..', '..', 'stdlib');
  const modules: Record<string, string> = {};
  const files = fs.readdirSync(stdlibDir, { withFileTypes: true });
  for (const entry of files) {
    const entryPath = path.join(stdlibDir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.iris')) {
      const key = entry.name.replace(/\.iris$/, '');
      modules[key] = fs.readFileSync(entryPath, 'utf8');
    } else if (entry.isDirectory()) {
      const nested = fs.readdirSync(entryPath);
      for (const nestedFile of nested) {
        if (nestedFile.endsWith('.iris')) {
          const key = `${entry.name}/${nestedFile.replace(/\.iris$/, '')}`;
          modules[key] = fs.readFileSync(path.join(entryPath, nestedFile), 'utf8');
        }
      }
    }
  }
  return modules;
}

export function loadIrisTestCases(): TestCase[] {
  const testsDir = path.join(__dirname, '..', '..', 'tests', 'iris');
  if (!fs.existsSync(testsDir)) return [];
  const stdlibModules = loadStdlibModules();
  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.iris')).sort();

  return testFiles.map(file => {
    const filePath = path.join(testsDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const name = `Iris ${file}`;
    return {
      name,
      fn: async () => {
        const result = await run(source, {}, stdlibModules);
        if (typeof result !== 'string') throw new Error('Unexpected interpreter result type');
        if (
          result.startsWith('RuntimeError:') ||
          result.startsWith('TypeError:') ||
          result.startsWith('ParseError:')
        ) {
          throw new Error(result);
        }
        const assertions = parseResult(result);
        const failed = assertions.filter(a => a.status !== 'pass');
        if (failed.length > 0) {
          const details = failed.map(f => `${f.name}: ${f.message || f.status}`).join('; ');
          throw new Error(`Failed assertions: ${details}`);
        }
      }
    } as TestCase;
  });
}
