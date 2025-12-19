
export type Token =
    | { kind: 'LParen'; line: number; col: number }
    | { kind: 'RParen'; line: number; col: number }
    | { kind: 'Int'; value: bigint; line: number; col: number }
    | { kind: 'Bool'; value: boolean; line: number; col: number }
    | { kind: 'Str'; value: string; line: number; col: number }
    | { kind: 'Symbol'; value: string; line: number; col: number }
    | { kind: 'EOF'; line: number; col: number };
