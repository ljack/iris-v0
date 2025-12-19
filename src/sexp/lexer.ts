
import { Token } from './types';

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

        if (char === ';') {
            while (pos < input.length && input[pos] !== '\n') {
                pos++;
            }
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
