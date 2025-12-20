
import { IrisType, IrisEffect, SourceSpan } from '../types';
import { ParserContext } from './context';
import { Token } from './types';

export function parseType(ctx: ParserContext): IrisType {
    const token = ctx.peek();
    const tokenSpan = (t: { line: number; col: number; value?: unknown }): SourceSpan => {
        if (typeof t.value === 'string') {
            return { line: t.line, col: t.col, len: t.value.length };
        }
        return { line: t.line, col: t.col, len: 1 };
    };
    if (token.kind === 'Symbol') {
        const w = token.value;
        ctx.consume();
        if (w === 'I64') return { type: 'I64', span: tokenSpan(token) };
        if (w === 'Bool') return { type: 'Bool', span: tokenSpan(token) };
        if (w === 'Str') return { type: 'Str', span: tokenSpan(token) };
        // Allow user-defined named types

        if (w === 'Union') {
            const variants: Record<string, IrisType> = {};
            while (!ctx.check('RParen')) {
                ctx.expect('LParen');
                ctx.expectSymbol('tag');
                const tagName = ctx.expectString();
                const content = parseType(ctx);
                ctx.expect('RParen');
                variants[tagName] = content;
            }
            ctx.expect('RParen');
            return { type: 'Union', variants, span: tokenSpan(token) };
        }
        if (w === 'Record' || w === 'record') {
            const fields: Record<string, IrisType> = {};
            while (!ctx.check('RParen')) {
                ctx.expect('LParen');
                const key = ctx.expectSymbol();
                const val = parseType(ctx);
                ctx.expect('RParen');
                fields[key] = val;
            }
            ctx.expect('RParen');
            return { type: 'Record', fields, span: tokenSpan(token) };
        }
        return { type: 'Named', name: w, span: tokenSpan(token) };
    }

    if (token.kind === 'LParen') {
        ctx.consume();
        const head = ctx.peek();
        if (head.kind !== 'Symbol') throw new Error("Expected type constructor");
        const tMap = head.value;
        const headSpan = tokenSpan(head);
        ctx.consume();

        if (tMap === 'Option') {
            const inner = parseType(ctx);
            ctx.expect('RParen');
            return { type: 'Option', inner, span: headSpan };
        }
        if (tMap === 'Result') {
            const ok = parseType(ctx);
            const err = parseType(ctx);
            ctx.expect('RParen');
            return { type: 'Result', ok, err, span: headSpan };
        }
        if (tMap === 'List') {
            const inner = parseType(ctx);
            ctx.expect('RParen');
            return { type: 'List', inner, span: headSpan };
        }
        if (tMap === 'Record' || tMap === 'record') {
            // (Record (f1 T1) (f2 T2))
            const fields: Record<string, IrisType> = {};
            while (!ctx.check('RParen')) {
                ctx.expect('LParen');
                const name = ctx.expectSymbol();
                const type = parseType(ctx);
                ctx.expect('RParen');
                fields[name] = type;
            }
            ctx.expect('RParen');
            return { type: 'Record', fields, span: headSpan };
        }
        if (tMap === 'Map') {
            const key = parseType(ctx);
            const value = parseType(ctx);
            ctx.expect('RParen');
            return { type: 'Map', key, value, span: headSpan };
        }
        if (tMap === 'Tuple') {
            const items: IrisType[] = [];
            while (!ctx.check('RParen')) {
                items.push(parseType(ctx));
            }
            ctx.expect('RParen');
            return { type: 'Tuple', items, span: headSpan };
        }

        if (tMap === 'Union') {
            const variants: Record<string, IrisType> = {};
            while (!ctx.check('RParen')) {
                ctx.expect('LParen');
                ctx.expectSymbol('tag');
                const tagName = ctx.expectString();
                const content = parseType(ctx);
                ctx.expect('RParen');
                variants[tagName] = content;
            }
            ctx.expect('RParen');
            return { type: 'Union', variants, span: headSpan };
        }

        if (tMap === 'union') {
            const variants: Record<string, IrisType> = {};
            while (!ctx.check('RParen')) {
                // (tag "Name" (args...))
                ctx.expect('LParen');
                ctx.expectSymbol('tag');
                const tagName = ctx.expectString();


                // Parse content typetional or list?
                // Spec usually: (tag "Name" (T1 T2...))
                // Let's assume (tag "Name" (T)) for matching t129.
                let args: IrisType[] = [];
                if (ctx.check('LParen')) {
                    ctx.expect('LParen');
                    while (!ctx.check('RParen')) {
                        args.push(parseType(ctx));
                    }
                    ctx.expect('RParen');
                }
                ctx.expect('RParen');

                // Store strict as tuple for now, unless single arg
                if (args.length === 1) {
                    variants[tagName] = args[0];
                } else {
                    variants[tagName] = { type: 'Tuple', items: args };
                }
            }
            ctx.expect('RParen');
            return { type: 'Union', variants, span: headSpan };
        }

        if (tMap === 'Fn') {
            // (Fn (Args...) Ret [Eff])
            const args: IrisType[] = [];
            ctx.expect('LParen');
            while (!ctx.check('RParen')) {
                args.push(parseType(ctx));
            }
            ctx.expect('RParen');

            const ret = parseType(ctx);

            let eff: IrisEffect = '!Pure'; // Default
            const next = ctx.peek();
            if (next.kind === 'Symbol' && next.value.startsWith('!')) {
                eff = parseEffect(ctx);
            }

            ctx.expect('RParen');
            return { type: 'Fn', args, ret, eff, span: headSpan };
        }

        ctx.expect('RParen'); // Fallback
        throw new Error(`Unknown type constructor: ${tMap}`);
    }

    throw new Error(`Unexpected token in type`);
}

export function parseEffect(ctx: ParserContext): IrisEffect {
    const t = ctx.peek();
    if (t.kind === 'Symbol' && t.value.startsWith('!')) {
        ctx.consume();
        if (['!Pure', '!IO', '!Net', '!Any', '!Infer'].includes(t.value)) {
            return t.value as IrisEffect;
        }
        throw new Error(`Unknown effect: ${t.value}`);
    }
    throw new Error("Expected effect starting with !");
}
