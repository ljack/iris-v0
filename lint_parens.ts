
import * as fs from 'fs';
import * as path from 'path';

function checkParens(file: string): boolean {
    const content = fs.readFileSync(file, 'utf-8');
    let balance = 0;
    const lines = content.split('\n');
    let error = false;

    // Filter out comments (lines starting with ;) 
    // And handle inline comments?
    // Simplified checker: just count ( and ) ignoring strings and comments

    // We'll use a simple state machine
    let inString = false;
    let inComment = false;
    let escaped = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inComment) {
            if (char === '\n') inComment = false;
            continue;
        }

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === ';') {
            inComment = true;
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '(') balance++;
        if (char === ')') balance--;

        if (balance < 0) {
            console.error(`Error: Unexpected closing parenthesis in ${file} at index ${i}`);
            return false;
        }

        if (char === '\n') {
            console.log(`Line ${content.substring(0, i).split('\n').length - 1}: Balance ${balance}`);
        }
    }

    if (balance !== 0) {
        console.error(`Error: Unbalanced parentheses in ${file}. Final balance: ${balance}`);
        return false;
    }
    return true;
}

const target = process.argv[2];
if (target) {
    if (!checkParens(target)) process.exit(1);
    console.log("Parentheses balanced.");
} else {
    const dir = 'examples';
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.iris'));
    let pass = true;
    for (const f of files) {
        if (!checkParens(path.join(dir, f))) {
            pass = false;
        }
    }
    if (pass) {
        console.log('All Iris files have balanced parentheses.');
    } else {
        process.exit(1);
    }
}
