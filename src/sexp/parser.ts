
import { Program, Definition, Expr, IrisType, IrisEffect, Import, Capability } from '../types';
import { Token } from './types';
import { tokenize } from './lexer';
import { ParserContext } from './context';
import { parseType, parseEffect } from './parse-type';
import { parseExpr } from './parse-expr';

export class Parser implements ParserContext {
    private tokens: Token[];
    private pos = 0;
    public debug = false;
    private lastClosedSection: { name: string, line: number, col: number } | null = null;

    constructor(input: string, debug: boolean = false) {
        this.tokens = tokenize(input);
        this.debug = debug;
    }

    public log(msg: string) {
        if (this.debug) {
            console.log(`[Parser] ${msg}`);
        }
    }

    parse(): Program {
        this.expect('LParen');
        this.expectSymbol('program');

        let moduleDecl = { name: 'unknown', version: 0 };
        const imports: Import[] = [];
        const defs: Definition[] = [];

        while (!this.check('RParen')) {
            this.log(`Parsing section loop. Peek: ${this.peek().kind} '${(this.peek() as any).value || ''}'`);
            this.expect('LParen');
            const section = this.expectSymbol();
            this.log(`Start section: ${section}`);

            if (section === 'module') {
                this.expect('LParen');
                this.expectSymbol('name');
                const name = this.expectString();
                this.expect('RParen');
                this.expect('LParen');
                this.expectSymbol('version');
                const version = Number(this.expectInt());
                this.expect('RParen');
                this.expect('RParen');
                moduleDecl = { name, version };
                this.log(`Parsed module: ${name} v${version}`);
                this.lastClosedSection = { name: 'module', line: this.tokens[this.pos - 1].line, col: this.tokens[this.pos - 1].col };
            } else if (section === 'imports') {
                this.log('Parsing imports...');
                while (!this.check('RParen')) {
                    this.expect('LParen');
                    this.expectSymbol('import');
                    const path = this.expectString();
                    let alias = '';
                    if (this.check('LParen')) {
                        this.expect('LParen');
                        this.expectSymbol('as');
                        alias = this.expectString();
                        this.expect('RParen');
                    } else {
                        throw new Error("Import must have alias currently");
                    }
                    this.expect('RParen');
                    imports.push({ path, alias });
                }
                this.expect('RParen');
                this.log(`Parsed ${imports.length} imports`);
                this.lastClosedSection = { name: 'imports', line: this.tokens[this.pos - 1].line, col: this.tokens[this.pos - 1].col };
            } else if (section === 'defs') {
                this.log('Parsing defs...');
                while (!this.check('RParen')) {
                    const t = this.peek();
                    this.log(`Parsing definition. Peek: ${t.kind} '${(t as any).value || ''}' at ${t.line}:${t.col}`);
                    if (t.kind === 'RParen') {
                        this.log("Saw RParen explicitly in loop check (should not happen due to while condition)");
                    }
                    defs.push(this.parseDefinition());
                }
                const endT = this.peek();
                this.log(`Finished parsing defs. Peek is: ${endT.kind} at ${endT.line}:${endT.col}`);
                this.expect('RParen');
                this.lastClosedSection = { name: 'defs', line: this.tokens[this.pos - 1].line, col: this.tokens[this.pos - 1].col };
            } else {
                this.log(`Unknown section: ${section}`);
                let msg = `Unknown program section: ${section} at line ${this.tokens[this.pos].line}`;
                if (this.lastClosedSection) {
                    msg += `. Note: Previous section '${this.lastClosedSection.name}' closed at ${this.lastClosedSection.line}:${this.lastClosedSection.col}`;
                }
                throw new Error(msg);
            }
        }

        this.expect('RParen');
        return { module: moduleDecl, imports, defs };
    }

    private parseMetaSection(
        meta: { doc?: string; requires?: string; ensures?: string; caps?: Capability[] },
        allowed: { doc?: boolean; requires?: boolean; ensures?: boolean; caps?: boolean }
    ) {
        const save = this.pos;
        this.expect('LParen');
        const tagTok = this.peek();
        if (tagTok.kind !== 'Symbol') {
            this.pos = save;
            this.skipSExp();
            return;
        }
        const tag = this.expectSymbol();

        if (tag === 'doc' && allowed.doc) {
            meta.doc = this.expectString();
            this.expect('RParen');
            return;
        }
        if (tag === 'requires' && allowed.requires) {
            meta.requires = this.expectString();
            this.expect('RParen');
            return;
        }
        if (tag === 'ensures' && allowed.ensures) {
            meta.ensures = this.expectString();
            this.expect('RParen');
            return;
        }
        if (tag === 'caps' && allowed.caps) {
            const caps: Capability[] = [];
            while (!this.check('RParen')) {
                this.expect('LParen');
                const name = this.expectSymbol();
                const type = parseType(this);
                this.expect('RParen');
                caps.push({ name, type });
            }
            this.expect('RParen');
            meta.caps = caps;
            return;
        }

        // Unknown or unsupported metadata tag; skip it.
        this.pos = save;
        this.skipSExp();
    }

    private parseDefinition(): Definition {
        this.expect('LParen');
        const kind = this.expectSymbol();

        if (kind === 'defconst') {
            this.expect('LParen'); this.expectSymbol('name'); const name = this.expectSymbol(); this.expect('RParen');
            this.expect('LParen'); this.expectSymbol('type'); const type = parseType(this); this.expect('RParen');
            const meta: { doc?: string } = {};
            while (this.check('LParen')) {
                const save = this.pos;
                this.expect('LParen');
                const tag = this.peek();
                if (tag.kind === 'Symbol' && tag.value === 'value') {
                    this.pos = save;
                    break;
                }
                this.pos = save;
                this.parseMetaSection(meta, { doc: true });
            }
            this.expect('LParen'); this.expectSymbol('value'); const value = parseExpr(this); this.expect('RParen');
            this.expect('RParen');
            return { kind: 'DefConst', name, type, value, doc: meta.doc };
        } else if (kind === 'deffn') {
            this.expect('LParen'); this.expectSymbol('name'); const name = this.expectSymbol(); this.expect('RParen');

            this.expect('LParen'); this.expectSymbol('args');
            const args: { name: string, type: IrisType }[] = [];
            while (!this.check('RParen')) {
                this.expect('LParen');
                const argName = this.expectSymbol();
                const argType = parseType(this);
                this.expect('RParen');
                args.push({ name: argName, type: argType });
            }
            this.expect('RParen');

            this.expect('LParen'); this.expectSymbol('ret'); const ret = parseType(this); this.expect('RParen');
            this.expect('LParen'); this.expectSymbol('eff'); const eff = parseEffect(this); this.expect('RParen');

            const meta: { doc?: string; requires?: string; ensures?: string; caps?: Capability[] } = {};
            while (this.check('LParen')) {
                const save = this.pos;
                this.expect('LParen');
                const tag = this.peek();
                if (tag.kind === 'Symbol' && tag.value === 'body') {
                    this.pos = save;
                    break;
                }
                this.pos = save;
                this.parseMetaSection(meta, { doc: true, requires: true, ensures: true, caps: true });
            }

            this.expect('LParen'); this.expectSymbol('body'); const body = parseExpr(this); this.expect('RParen');
            this.expect('RParen');

            return { kind: 'DefFn', name, args, ret, eff, body, ...meta };
        } else if (kind === 'deftool') {
            this.expect('LParen'); this.expectSymbol('name'); const name = this.expectSymbol(); this.expect('RParen');

            this.expect('LParen'); this.expectSymbol('args');
            const args: { name: string, type: IrisType }[] = [];
            while (!this.check('RParen')) {
                this.expect('LParen');
                const argName = this.expectSymbol();
                const argType = parseType(this);
                this.expect('RParen');
                args.push({ name: argName, type: argType });
            }
            this.expect('RParen');

            this.expect('LParen'); this.expectSymbol('ret'); const ret = parseType(this); this.expect('RParen');
            this.expect('LParen'); this.expectSymbol('eff'); const eff = parseEffect(this); this.expect('RParen');

            const meta: { doc?: string; requires?: string; ensures?: string; caps?: Capability[] } = {};
            while (this.check('LParen')) {
                this.parseMetaSection(meta, { doc: true, requires: true, ensures: true, caps: true });
            }
            this.expect('RParen');

            return { kind: 'DefTool', name, args, ret, eff, ...meta };
        } else if (kind === 'type' || kind === 'deftype') {
            const name = this.expectSymbol();
            const type = parseType(this);
            const meta: { doc?: string } = {};
            while (this.check('LParen')) {
                this.parseMetaSection(meta, { doc: true });
            }
            this.expect('RParen');
            return { kind: 'TypeDef', name, type, doc: meta.doc };
        } else {
            throw new Error(`Unknown definition kind: ${kind}`);
        }
    }

    public parseExpr(): Expr {
        return parseExpr(this);
    }

    public peek() {
        if (this.pos >= this.tokens.length) return { kind: 'EOF', line: 0, col: 0 } as Token;
        return this.tokens[this.pos];
    }
    public consume() {
        // console.log(`Consume: ${this.tokens[this.pos]?.kind} '${(this.tokens[this.pos] as any)?.value || ''}'`);
        this.pos++;
    }

    public check(kind: Token['kind']): boolean {
        const t = this.peek();
        // console.log(`Check ${kind} vs ${t.kind}`);
        return t.kind === kind;
    }

    public expect(kind: Token['kind']) {
        const t = this.peek();
        // console.log(`Expect ${kind} vs ${t.kind} at ${t.line}:${t.col}`);
        if (t.kind !== kind) {
            throw new Error(`Expected ${kind} at ${t.line}:${t.col}, got ${t.kind} '${(t as any).value || ''}'`);
        }
        this.consume();
    }

    public expectSymbol(val?: string): string {
        const t = this.peek();
        if (t.kind !== 'Symbol') {
            throw new Error(`Expected Symbol at ${t.line}:${t.col}, got ${t.kind}`);
        }
        if (val && t.value !== val) {
            throw new Error(`Expected symbol '${val}' at ${t.line}:${t.col}, got '${t.value}'`);
        }
        this.consume();
        return t.value;
    }

    public expectString(): string {
        const t = this.peek();
        if (t.kind !== 'Str') {
            throw new Error(`Expected String at ${t.line}:${t.col}, got ${t.kind}`);
        }
        this.consume();
        return t.value;
    }

    public expectInt(): bigint {
        const t = this.peek();
        if (t.kind !== 'Int') {
            throw new Error(`Expected Int at ${t.line}:${t.col}, got ${t.kind}`);
        }
        this.consume();
        return t.value;
    }

    public skipSExp() {
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
}
