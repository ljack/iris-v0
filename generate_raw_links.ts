import * as fs from 'fs';
import * as path from 'path';

const REPO_USER = 'ljack';
const REPO_NAME = 'iris-v0';
const BRANCH = 'master';
const BASE_RAW = `https://raw.githubusercontent.com/${REPO_USER}/${REPO_NAME}/${BRANCH}`;
const BASE_TREE = `https://github.com/${REPO_USER}/${REPO_NAME}/tree/${BRANCH}`;

const ROOT = process.cwd();
const IGNORE = ['.git', 'node_modules', '.DS_Store', 'raw.txt', 'dist', '.gemini', '.claude', '.agent'];

function processDir(dir: string) {
    const items = fs.readdirSync(dir);
    const lines: string[] = [];

    // Sort items for consistent output
    items.sort();

    for (const item of items) {
        if (IGNORE.includes(item)) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        const itemRelative = path.relative(ROOT, fullPath);

        if (stat.isDirectory()) {
            lines.push(`${BASE_TREE}/${itemRelative}`);
            processDir(fullPath); // Recurse
        } else {
            lines.push(`${BASE_RAW}/${itemRelative}`);
        }
    }

    if (lines.length > 0) {
        fs.writeFileSync(path.join(dir, 'raw.txt'), lines.join('\n') + '\n');
        console.log(`Generated raw.txt in ${dir}`);
    }
}

processDir(ROOT);
