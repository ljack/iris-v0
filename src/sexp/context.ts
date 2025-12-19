
import { Token } from './types';

export interface ParserContext {
    peek(): Token;
    consume(): void;
    check(kind: Token['kind']): boolean;
    expect(kind: Token['kind']): void;
    expectSymbol(val?: string): string;
    expectString(): string;
    expectInt(): bigint;
    skipSExp(): void;
}
