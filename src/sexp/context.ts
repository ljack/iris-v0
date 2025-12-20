
import { Token } from './types';

export interface ParserContext {
    peek(): Token;
    consume(): void;
    check(kind: Token['kind']): boolean;
    expect(kind: Token['kind']): void;
    expectSymbol(val?: string): string;
    expectSymbolToken(val?: string): Extract<Token, { kind: 'Symbol' }>;
    expectString(): string;
    expectStringToken(): Extract<Token, { kind: 'Str' }>;
    expectInt(): bigint;
    skipSExp(): void;
    debug?: boolean;
    log(msg: string): void;
}
