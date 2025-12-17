import { Parser } from './src/sexp';
import * as fs from 'fs';

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: ts-node validate_syntax.ts <file>");
    process.exit(1);
}

const code = fs.readFileSync(filePath, 'utf8');
try {
    const program = new Parser(code).parse();
    console.log("Syntax OK");
} catch (e: any) {
    console.error(e.message);
    process.exit(1);
}
