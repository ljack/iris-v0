
import { Expr, MatchCase, IntrinsicOp, Value } from '../types';
import { ParserContext } from './context';
import { parseType } from './parse-type';

export function parseExpr(ctx: ParserContext): Expr {
    const token = ctx.peek();

    if (token.kind === 'Int') { ctx.consume(); return { kind: 'Literal', value: { kind: 'I64', value: token.value } }; }
    if (token.kind === 'Bool') { ctx.consume(); return { kind: 'Literal', value: { kind: 'Bool', value: token.value } }; }
    if (token.kind === 'Str') { ctx.consume(); return { kind: 'Literal', value: { kind: 'Str', value: token.value } }; }
    if (token.kind === 'Symbol') {
        if (token.value === 'None') { ctx.consume(); return { kind: 'Literal', value: { kind: 'Option', value: null } }; }
        if (token.value === 'nil') { ctx.consume(); return { kind: 'Literal', value: { kind: 'List', items: [] } }; }
        ctx.consume();
        return { kind: 'Var', name: token.value };
    }

    if (token.kind === 'LParen') {
        ctx.consume();
        const head = ctx.peek();

        if (head.kind !== 'Symbol') {
            // (expr ...) -> Group or Tuple
            const items: Expr[] = [];
            while (!ctx.check('RParen')) {
                items.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            if (items.length === 1) return items[0];
            return { kind: 'Tuple', items };
        }

        const op = head.value;
        ctx.consume();

        // Special forms
        if (op === 'let') {
            // (let (x EXPR) BODY)
            ctx.expect('LParen');
            const name = ctx.expectSymbol();
            const val = parseExpr(ctx);
            ctx.expect('RParen');
            const body = parseExpr(ctx);
            ctx.expect('RParen');
            return { kind: 'Let', name, value: val, body };
        }
        if (op === 'record') {
            // (record (k v) ...)
            const fields: Expr[] = [];
            while (!ctx.check('RParen')) {
                ctx.expect('LParen');
                const key = ctx.expectSymbol();
                const val = parseExpr(ctx);
                ctx.expect('RParen');

                const keyExpr: Expr = { kind: 'Literal', value: { kind: 'Str', value: key } };
                const fieldTuple: Expr = { kind: 'Tuple', items: [keyExpr, val] };
                fields.push(fieldTuple);
            }
            ctx.expect('RParen');
            return { kind: 'Record', fields };
        }
        if (op === 'if') {
            const cond = parseExpr(ctx);
            const thenBr = parseExpr(ctx);
            const elseBr = parseExpr(ctx);
            ctx.expect('RParen');
            return { kind: 'If', cond, then: thenBr, else: elseBr };
        }
        if (op === 'match') {
            const target = parseExpr(ctx);
            const cases: MatchCase[] = [];
            while (!ctx.check('RParen')) {
                ctx.expect('LParen');
                ctx.expectSymbol('case');
                ctx.expect('LParen');
                ctx.expectSymbol('tag');
                const tag = ctx.expectString();
                const vars: string[] = [];
                // Optional args (v) or nothing
                if (ctx.check('LParen')) {
                    ctx.expect('LParen');
                    while (!ctx.check('RParen')) {
                        vars.push(ctx.expectSymbol());
                    }
                    ctx.expect('RParen');
                }
                ctx.expect('RParen'); // close tag
                const body = parseExpr(ctx);
                ctx.expect('RParen'); // close case

                const varsValue: Value = {
                    kind: 'List',
                    items: vars.map(v => ({ kind: 'Str', value: v } as Value))
                };
                cases.push({ tag, vars: varsValue, body });
            }
            ctx.expect('RParen');
            return { kind: 'Match', target, cases };
        }
        if (op === 'call') {
            const fn = ctx.expectSymbol();
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Call', fn, args };
        }

        // Constructors / Intrinsics
        if (['+', '-', '*', '/', '%', '<=', '<', '=', '>=', '>', '&&', '||', '!', 'Some', 'Ok', 'Err', 'cons', 'tuple.get', 'record.get', 'io.print', 'io.read_file', 'io.write_file', 'i64.from_string', 'i64.to_string'].includes(op)) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (io.* ...)
        if (op.startsWith('io.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (net.* ...)
        if (op.startsWith('net.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (http.* ...)
        if (op.startsWith('http.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (str.* ...)
        if (op.startsWith('str.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (sys.* ...)
        if (op.startsWith('sys.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (map.* ...)
        if (op.startsWith('map.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (list.* ...)
        if (op.startsWith('list.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (tuple.* ...)
        if (op.startsWith('tuple.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // Check for (record.* ...)
        if (op.startsWith('record.')) {
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Intrinsic', op: op as IntrinsicOp, args };
        }

        // (list e1 ...)
        if (op === 'list') {
            const items: Expr[] = [];
            while (!ctx.check('RParen')) {
                items.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'List', items };
        }

        // (list-of Type e1 ...)
        if (op === 'list-of') {
            const typeArg = parseType(ctx);
            const items: Expr[] = [];
            while (!ctx.check('RParen')) {
                items.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'List', items, typeArg };
        }

        // (tuple e1 ...)
        if (op === 'tuple') {
            const items: Expr[] = [];
            while (!ctx.check('RParen')) {
                items.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Tuple', items };
        }

        if (op === 'union') {
            const tagName = ctx.expectString();
            const args: Expr[] = [];
            while (!ctx.check('RParen')) {
                args.push(parseExpr(ctx));
            }
            ctx.expect('RParen');
            return { kind: 'Tuple', items: [{ kind: 'Literal', value: { kind: 'Str', value: tagName } }, ...args] };
        }

        if (op === 'tag') {
            const tagName = ctx.expectString();
            let value: Expr;
            if (ctx.check('RParen')) {
                // Empty tag payload -> Unit/Empty Tuple?
                value = { kind: 'Tuple', items: [] };
            } else {
                value = parseExpr(ctx);
            }
            ctx.expect('RParen');
            return { kind: 'Tagged', tag: tagName, value };
        }
        const args: Expr[] = [];
        while (!ctx.check('RParen')) {
            args.push(parseExpr(ctx));
        }
        ctx.expect('RParen');
        return { kind: 'Call', fn: op, args };
    }

    throw new Error(`Unexpected token for expression: ${token.kind} at ${token.line}:${token.col}`);
}
