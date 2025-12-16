import type { Stats } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { run, check } from './main';

function printHelp() {
    console.log(`
Usage: iris [command] [options]

Commands:
  run <file>    Run an IRIS program
  check <file>  Type-check an IRIS program
  version       Show version
  help          Show this help message
`);
}

function printVersion() {
    // Read package.json or hardcode
    console.log('IRIS v0.4.0');
}

// Simple recursive module loader for CLI
function loadModules(entryPath: string, rootDir: string): Record<string, string> {
    const modules: Record<string, string> = {};

    // We need to parse imports to find modules... 
    // But strictly `run` takes a map.
    // Real implementation would parse, find imports, recursively read.
    // For v0.4, we might just read ALL .iris files in the dir? 
    // No, that's inefficient.
    // The `main.ts` Circular Import check re-parses. We should potentially expose a "Loader" or just do it here.
    // Let's do a naive "read all .iris in current dir" or just leave modules empty for now if we rely on single-file + stdlib?
    // Our tests use multi-module.
    // Let's implement a basic "read file, scan for (import "path" ...), recurse"

    return modules;
}

// Better Loader:
// Since `main.run` expects a fully populated modules map, we essentially need to implement the module resolution BEFORE calling run.
// Regex for import: /\(import\s+"([^"]+)"/g
function loadAllModulesRecursively(entryFile: string, loaded: Record<string, string> = {}): Record<string, string> {
    const content = fs.readFileSync(entryFile, 'utf-8');
    const baseDir = path.dirname(entryFile);

    // Simplistic regex parser for imports to build the map
    const importRegex = /\(import\s+"([^"]+)"/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!loaded[importPath]) {
            // Resolve relative to entry file
            // Spec says "resolved relative to file".
            // But our map keys are simple strings.
            // For now, let's assume imports are paths relative to CWD or simple filenames in same dir.
            // Goal 4 tasks used simple filenames.
            const resolvedPath = path.resolve(baseDir, importPath.endsWith('.iris') ? importPath : importPath + '.iris');

            if (fs.existsSync(resolvedPath)) {
                const modContent = fs.readFileSync(resolvedPath, 'utf-8');
                // Key in map is the "path" string used in import
                loaded[importPath] = modContent;
                loadAllModulesRecursively(resolvedPath, loaded);
            }
        }
    }
    return loaded;
}

export function cli(args: string[]) {
    const command = args[0];
    const file = args[1];

    if (!command || command === 'help') {
        printHelp();
        return;
    }

    if (command === 'version') {
        printVersion();
        return;
    }

    if (command === 'run' || command === 'check') {
        if (!file) {
            console.error('Error: No file specified.');
            process.exit(1);
        }

        const absolutePath = path.resolve(file);
        if (!fs.existsSync(absolutePath)) {
            console.error(`Error: File not found: ${file}`);
            process.exit(1);
        }

        const source = fs.readFileSync(absolutePath, 'utf-8');

        // Load modules
        const modules = loadAllModulesRecursively(absolutePath);

        if (command === 'check') {
            const result = check(source, modules);
            if (!result.success) {
                console.error(result.error);
                process.exit(1);
            }
            console.log("✅ No type errors found.");
            return;
        }

        const nodeFs = {
            readFile: (p: string) => {
                try {
                    return fs.readFileSync(p, 'utf-8');
                } catch {
                    return null;
                }
            },
            writeFile: (p: string, c: string) => {
                try {
                    fs.writeFileSync(p, c);
                    return true;
                } catch {
                    return false;
                }
            },
            exists: (p: string) => {
                return fs.existsSync(p);
            }
        };

        console.log(run(source, nodeFs, modules));
    } else {
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    cli(process.argv.slice(2));
}
