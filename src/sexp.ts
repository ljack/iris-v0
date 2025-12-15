import { Program, Definition, Expr, IrisType, IrisEffect, MatchCase, IntrinsicOp, Value } from './types';

export type Token =
    | { kind: 'LParen'; line: number; col: number }
    | { kind: 'RParen'; line: number; col: number }
    | { kind: 'Int'; value: bigint; line: number; col: number }
    | { kind: 'Bool'; value: boolean; line: number; col: number }
    | { kind: 'Str'; value: string; line: number; col: number }
    | { kind: 'Symbol'; value: string; line: number; col: number }
    | { kind: 'EOF'; line: number; col: number };

export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    let line = 1;
    let col = 1;

    while (pos < input.length) {
        const char = input[pos];

        if (/\s/.test(char)) {
            if (char === '\n') {
                line++;
                col = 1;
            } else {
                col++;
            }
            pos++;
            continue;
        }

        if (char === '(') {
            tokens.push({ kind: 'LParen', line, col });
            pos++; col++;
            continue;
        }

        if (char === ')') {
            tokens.push({ kind: 'RParen', line, col });
            pos++; col++;
            continue;
        }

        // String
        if (char === '"') {
            const startLine = line;
            const startCol = col;
            pos++; col++;
            let strVal = '';
            while (pos < input.length && input[pos] !== '"') {
                const c = input[pos];
                if (c === '\\') {
                    // Handle escapes in source code if needed?
                    // Spec: "Tokens: ... strings "..."."
                    // Usually source strings allow escapes. 
                    // For v0 let's handle basic escapes if we encounter backslash.
                    // But spec "Lexical" doesn't explicitly detail escape sequences for *parsing*, 
                    // only for *printing*.
                    // Let's assume standard JSON-ish behavior or raw.
                    // Ideally we should process escapes.
                    if (pos + 1 < input.length) {
                        const next = input[pos + 1];
                        if (next === '"') strVal += '"';
                        else if (next === 'n') strVal += '\n';
                        else if (next === 't') strVal += '\t';
                        else if (next === 'r') strVal += '\r';
                        else if (next === '\\') strVal += '\\';
                        else strVal += next;
                        pos += 2; col += 2;
                        continue;
                    }
                }

                if (c === '\n') {
                    line++;
                    col = 1;
                } else {
                    col++;
                }
                strVal += c;
                pos++;
            }
            if (pos >= input.length) {
                throw new Error(`Unterminated string starting at ${startLine}:${startCol}`);
            }
            pos++; col++; // Consume closing quote
            tokens.push({ kind: 'Str', value: strVal, line: startLine, col: startCol });
            continue;
        }

        // Integer (start with digit or -digit)
        if (char === '-' && pos + 1 < input.length && /\d/.test(input[pos + 1])) {
            // Negative integer
            let buf = '-';
            pos++; col++;
            while (pos < input.length && /\d/.test(input[pos])) {
                buf += input[pos];
                pos++; col++;
            }
            tokens.push({ kind: 'Int', value: BigInt(buf), line: line, col: col - buf.length });
            continue;
        }

        if (/\d/.test(char)) {
            let buf = '';
            const startCol = col;
            while (pos < input.length && /\d/.test(input[pos])) {
                buf += input[pos];
                pos++; col++;
            }
            tokens.push({ kind: 'Int', value: BigInt(buf), line, col: startCol });
            continue;
        }

        // Symbol (or Bool)
        // Allowed symbol chars: non-whitespace, not ( ) "
        if (/[^()\s"]/.test(char)) {
            let buf = '';
            const startCol = col;
            while (pos < input.length && /[^()\s"]/.test(input[pos])) {
                buf += input[pos];
                pos++; col++;
            }

            if (buf === 'true') {
                tokens.push({ kind: 'Bool', value: true, line, col: startCol });
            } else if (buf === 'false') {
                tokens.push({ kind: 'Bool', value: false, line, col: startCol });
            } else {
                tokens.push({ kind: 'Symbol', value: buf, line, col: startCol });
            }
            continue;
        }

        throw new Error(`Unexpected character '${char}' at ${line}:${col}`);
    }

    tokens.push({ kind: 'EOF', line, col });
    return tokens;
}

export class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(input: string) {
        this.tokens = tokenize(input);
    }

    parse(): Program {
        this.expect('LParen');
        this.expectSymbol('program');

        // (module (name "X") (version 0))
        this.expect('LParen');
        this.expectSymbol('module');
        this.expect('LParen');
        this.expectSymbol('name');
        const modName = this.expectString();
        this.expect('RParen');
        this.expect('LParen');
        this.expectSymbol('version');
        const version = this.expectInt();
        this.expect('RParen');
        this.expect('RParen');

        // (defs ...)
        this.expect('LParen');
        this.expectSymbol('defs');
        const defs: Definition[] = [];
        while (!this.check('RParen')) {
            defs.push(this.parseDefinition());
        }
        this.expect('RParen');

        this.expect('RParen');

        return {
            module: { name: modName, version: Number(version) },
            defs
        };
    }

    private parseDefinition(): Definition {
        this.expect('LParen');
        const kind = this.expectSymbol();

        if (kind === 'defconst') {
            // (defconst (name ID) (type T) (value EXPR))
            this.expect('LParen'); this.expectSymbol('name'); const name = this.expectSymbol(); this.expect('RParen');
            this.expect('LParen'); this.expectSymbol('type'); const type = this.parseType(); this.expect('RParen');
            this.expect('LParen'); this.expectSymbol('value'); const value = this.parseExpr(); this.expect('RParen');
            this.expect('RParen');
            return { kind: 'DefConst', name, type, value };
        } else if (kind === 'deffn') {
            // (deffn (name ID) (args ...) (ret T) (eff !) (body ...))
            this.expect('LParen'); this.expectSymbol('name'); const name = this.expectSymbol(); this.expect('RParen');

            this.expect('LParen'); this.expectSymbol('args');
            const args: { name: string, type: IrisType }[] = [];
            while (!this.check('RParen')) {
                this.expect('LParen');
                const argName = this.expectSymbol();
                const argType = this.parseType();
                this.expect('RParen');
                args.push({ name: argName, type: argType });
            }
            this.expect('RParen');

            this.expect('LParen'); this.expectSymbol('ret'); const ret = this.parseType(); this.expect('RParen');
            this.expect('LParen'); this.expectSymbol('eff'); const eff = this.expectEffect(); this.expect('RParen');

            // Optional requires/ensures? Spec says optional. We'll skip for now or peek.
            while (this.check('LParen')) {
                // Peek ahead to see if it is body
                const save = this.pos;
                this.expect('LParen');
                const tag = this.peek();
                if (tag.kind === 'Symbol' && tag.value === 'body') {
                    this.pos = save;
                    break;
                }
                // Skip requires/ensures for now
                this.pos = save;
                this.skipSExp();
            }

            this.expect('LParen'); this.expectSymbol('body'); const body = this.parseExpr(); this.expect('RParen');
            this.expect('RParen');

            return { kind: 'DefFn', name, args, ret, eff, body };
        } else {
            throw new Error(`Unknown definition kind: ${kind}`);
        }
    }

    private parseExpr(): Expr {
        const token = this.peek();

        if (token.kind === 'Int') { this.consume(); return { kind: 'Literal', value: { kind: 'I64', value: token.value } }; }
        if (token.kind === 'Bool') { this.consume(); return { kind: 'Literal', value: { kind: 'Bool', value: token.value } }; }
        if (token.kind === 'Str') { this.consume(); return { kind: 'Literal', value: { kind: 'Str', value: token.value } }; }
        if (token.kind === 'Symbol') {
            if (token.value === 'None') { this.consume(); return { kind: 'Literal', value: { kind: 'Option', value: null } }; }
            if (token.value === 'nil') { this.consume(); return { kind: 'Literal', value: { kind: 'List', items: [] } }; }
            this.consume();
            return { kind: 'Var', name: token.value };
        }

        if (token.kind === 'LParen') {
            this.consume();
            const head = this.peek();

            if (head.kind === 'Symbol') {
                const op = head.value;
                this.consume();

                // Special forms
                if (op === 'let') {
                    // (let (x EXPR) BODY)
                    this.expect('LParen');
                    const name = this.expectSymbol();
                    const val = this.parseExpr();
                    this.expect('RParen');
                    const body = this.parseExpr();
                    this.expect('RParen');
                    return { kind: 'Let', name, value: val, body };
                }
                if (op === 'if') {
                    const cond = this.parseExpr();
                    const thenBr = this.parseExpr();
                    const elseBr = this.parseExpr();
                    this.expect('RParen');
                    return { kind: 'If', cond, then: thenBr, else: elseBr };
                }
                if (op === 'match') {
                    const target = this.parseExpr();
                    const cases: MatchCase[] = [];
                    while (!this.check('RParen')) {
                        this.expect('LParen');
                        this.expectSymbol('case');
                        this.expect('LParen');
                        this.expectSymbol('tag');
                        const tag = this.expectString();
                        const vars: string[] = [];
                        // Optional args (v) or nothing
                        if (this.check('LParen')) {
                            this.expect('LParen');
                            while (!this.check('RParen')) {
                                vars.push(this.expectSymbol());
                            }
                            this.expect('RParen');
                        }
                        this.expect('RParen'); // close tag
                        const body = this.parseExpr();
                        this.expect('RParen'); // close case
                        cases.push({ tag, vars, body });
                    }
                    this.expect('RParen');
                    return { kind: 'Match', target, cases };
                }
                if (op === 'call') {
                    const fn = this.expectSymbol();
                    const args: Expr[] = [];
                    while (!this.check('RParen')) {
                        args.push(this.parseExpr());
                    }
                    this.expect('RParen');
                    return { kind: 'Call', fn, args };
                }

                // Constructors / Intrinsics
                if (['+', '-', '*', '<=', '<', '=', 'Some', 'Ok', 'Err', 'cons', 'io.print', 'io.read_file', 'io.write_file'].includes(op)) {
                    const args: Expr[] = [];
                    while (!this.check('RParen')) {
                        args.push(this.parseExpr());
                    }
                    this.expect('RParen');
                    return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
                }

                // Check for (io.* ...)
                if (op.startsWith('io.')) {
                    const args: Expr[] = [];
                    while (!this.check('RParen')) {
                        args.push(this.parseExpr());
                    }
                    this.expect('RParen');
                    return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
                }

                throw new Error(`Unknown operator or special form: ${op}`);
            }

            throw new Error("Expected symbol after '('");
        }

        throw new Error(`Unexpected token for expression: ${token.kind}`);
    }

    private parseType(): IrisType {
        const token = this.peek();
        if (token.kind === 'Symbol') {
            const w = token.value;
            this.consume();
            if (w === 'I64') return { type: 'I64' };
            if (w === 'Bool') return { type: 'Bool' };
            if (w === 'Str') return { type: 'Str' };
        }

        if (token.kind === 'LParen') {
            this.consume();
            const head = this.peek();
            if (head.kind !== 'Symbol') throw new Error("Expected type constructor");
            const tMap = head.value;
            this.consume();

            if (tMap === 'Option') {
                const inner = this.parseType();
                this.expect('RParen');
                return { type: 'Option', inner };
            }
            if (tMap === 'Result') {
                const ok = this.parseType();
                const err = this.parseType();
                this.expect('RParen');
                return { type: 'Result', ok, err };
            }
            if (tMap === 'List') {
                const inner = this.parseType();
                this.expect('RParen');
                return { type: 'List', inner };
            }

            this.expect('RParen'); // Fallback
            throw new Error(`Unknown type constructor: ${tMap}`);
        }

        throw new Error(`Unexpected token in type`);
    }

    private expectEffect(): IrisEffect {
        const t = this.peek();
        if (t.kind === 'Symbol' && t.value.startsWith('!')) {
            this.consume();
            return t.value as IrisEffect;
        }
        throw new Error("Expected effect starting with !");
    }

    private skipSExp() {
        let depth = 0;
        if (this.check('LParen')) {
            this.consume();
            depth = 1;
            while (depth > 0 && this.pos < this.tokens.length) {
                if (this.check('LParen')) depth++;
                else if (this.check('RParen')) depth--;
                this.consume();
            }
        } else {
            this.consume();
        }
    }

    private peek() { if (this.pos >= this.tokens.length) return { kind: 'EOF', line: 0, col: 0 } as Token; return this.tokens[this.pos]; }
    private consume() { this.pos++; }
    private check(kind: string) { return this.peek().kind === kind; }
    private expect(kind: string) { if (!this.check(kind)) throw new Error(`Expected ${kind} at ${this.peek().line}:${this.peek().col}`); this.consume(); }
    private expectSymbol(val?: string) {
        const t = this.peek();
        if (t.kind !== 'Symbol' || (val && t.value !== val)) throw new Error(`Expected Symbol ${val || ''} at ${t.line}:${t.col}`);
        this.consume();
        return t.value;
    }
    private expectString() { const t = this.peek(); if (t.kind !== 'Str') throw new Error(`Expected String`); this.consume(); return t.value; }
    private expectInt() { const t = this.peek(); if (t.kind !== 'Int') throw new Error(`Expected Int`); this.consume(); return t.value; }
}

function escapeStr(s: string): string {
    return s.replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')
        .replace(/\r/g, '\\r');
}

export function printValue(v: Value): string {
    switch (v.kind) {
        case 'I64': return v.value.toString();
        case 'Bool': return v.value.toString();
        case 'Str': return `"${escapeStr(v.value)}"`;
        case 'Option': return v.value === null ? "None" : `(Some ${printValue(v.value)})`;
        case 'Result': return v.isOk ? `(Ok ${printValue(v.value)})` : `(Err ${printValue(v.value)})`;
        case 'List': return `(list ${v.items.map(printValue).join(' ')})`;
        case 'Tuple': return `(tuple ${v.items.map(printValue).join(' ')})`;
        case 'Record':
            // Sorted keys
            const keys = Object.keys(v.fields).sort();
            const fields = keys.map(k => `(${k} ${printValue(v.fields[k])})`).join(' ');
            return `(record ${fields})`;
    }
}
