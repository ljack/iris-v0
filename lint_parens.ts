
import * as fs from 'fs';

function lint(file: string) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let depth = 0;

    // Stack to track open sections: 'program', 'defs', 'deffn', 'body', etc.
    // Each item: { name: string, line: number, col: number, depth: number }
    const stack: { name: string, line: number, col: number, depth: number }[] = [];

    let inString = false;
    let escape = false;

    // Helper to log context
    const logContext = (l: number, c: number, char: string, action: string) => {
        // Only log major structure changes or depth 0 events
        if (depth <= 2 || stack.length <= 2) {
            const scope = stack.length > 0 ? stack[stack.length - 1].name : 'TOP';
            console.log(`[Line ${l + 1}:${c + 1}] ${action} '${char}' | Depth: ${depth} | Scope: ${scope}`);
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (inString) {
                if (escape) {
                    escape = false;
                } else if (char === '\\') {
                    escape = true;
                } else if (char === '"') {
                    inString = false;
                }
                continue;
            }

            if (char === ';') {
                // Comment start, ignore rest of line
                // Determine if it is ; or ;;
                // In Iris: ; is comment to EOL. 
                break;
            }

            if (char === '"') {
                inString = true;
                continue;
            }

            if (char === '(') {

                // Try to peek ahead to see what form this is
                let k = j + 1;
                while (k < line.length && /\s/.test(line[k])) k++;
                let formName = '';
                while (k < line.length && /[a-zA-Z0-9_!.]/.test(line[k])) {
                    formName += line[k];
                    k++;
                }

                if (formName) {
                    stack.push({ name: formName, line: i, col: j, depth: depth + 1 });
                    logContext(i, j, char, `OPEN (${formName})`);
                } else {
                    // Just a generic list/paren
                    // stack.push({ name: 'list', line: i, col: j, depth: depth });
                }

                depth++;

            } else if (char === ')') {
                // Check if we are closing a specific named section
                if (stack.length > 0 && stack[stack.length - 1].depth === depth) {
                    const closed = stack.pop();
                    logContext(i, j, char, `CLOSE (${closed?.name})`);

                    // CRITICAL: If we just closed 'defs' or 'program' prematurely
                    if (closed?.name === 'defs') {
                        console.log(`\n⚠️  [Line ${i + 1}:${j + 1}] 'defs' section CLOSED here.`);
                    }
                    if (closed?.name === 'program') {
                        console.log(`\n⚠️  [Line ${i + 1}:${j + 1}] 'program' section CLOSED here.`);
                    }
                }

                depth--;

                if (depth < 0) {
                    console.error(`\n❌ ERROR: Extra Closing Parenthesis at Line ${i + 1}:${j + 1}`);
                    return;
                }

                if (depth === 0) {
                    console.log(`\nℹ️  [Line ${i + 1}:${j + 1}] Reached Depth 0 (Top Level).`);
                }
            }
        }
    }

    if (depth > 0) {
        console.error(`\n❌ ERROR: Unbalanced Parentheses. Final Depth: ${depth}`);
        if (stack.length > 0) {
            console.log("Unclosed sections:");
            stack.forEach(s => console.log(` - ${s.name} (started at ${s.line + 1}:${s.col + 1})`));
        }
    } else {
        console.log("\n✅ Parentheses Balance Check Passed.");
    }
}

const file = process.argv[2];
if (!file) {
    console.log("Usage: ts-node lint_parens.ts <file>");
    process.exit(1);
}

lint(file);
