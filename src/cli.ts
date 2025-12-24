
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { run, check } from './main';
import { INetwork } from './eval';
import { IrisWasmHost } from './runtime/wasm_host';

function warnIfStaleBuild(distFile: string, srcFile: string, label: string) {
    try {
        if (!fs.existsSync(distFile) || !fs.existsSync(srcFile)) return;
        const distStat = fs.statSync(distFile);
        const srcStat = fs.statSync(srcFile);
        if (srcStat.mtimeMs > distStat.mtimeMs) {
            console.error(
                `Warning: ${label} is newer than the compiled output. Run "npm run build" to sync dist/ before running.`,
            );
        }
    } catch {
        // Non-fatal; continue without warning.
    }
}

function printHelp() {
    console.log(`
Usage: iris [command] [options]

Commands:
  run <file>    Run an IRIS program
  check <file>  Type-check an IRIS program
  run-wasm <file>  Compile IRIS to wasm and run it
  version       Show version
  help          Show this help message

Options:
  --debug       Enable debug logging
  --raw         Print raw string output (unescape quoted strings)
  --no-run      For run-wasm: compile only, do not execute
  --quiet       For run-wasm: suppress 'main returned' output
  --print-wat   For run-wasm: print WAT to stdout
  --wat-out <file>   For run-wasm: write WAT to file
  --wasm-out <file>  For run-wasm: write wasm binary to file
  --compiler <file>  For run-wasm: path to compiler.iris
  --wasm-profile <host|wasi>  For run-wasm: select ABI profile (default: host)
`);
}

function printVersion() {
    console.log('IRIS v0.4.0');
}

function loadAllModulesRecursively(entryFile: string, loaded: Record<string, string> = {}): Record<string, string> {
    const content = fs.readFileSync(entryFile, 'utf-8');
    const baseDir = path.dirname(entryFile);

    const importRegex = /\(import\s+"([^"]+)"/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!loaded[importPath]) {
            const resolvedPath = path.resolve(baseDir, importPath.endsWith('.iris') ? importPath : importPath + '.iris');
            if (fs.existsSync(resolvedPath)) {
                const modContent = fs.readFileSync(resolvedPath, 'utf-8');
                loaded[importPath] = modContent;
                loadAllModulesRecursively(resolvedPath, loaded);
            }
        }
    }
    return loaded;
}

class NodeNetwork implements INetwork {
    private servers = new Map<number, net.Server>();
    private sockets = new Map<number, net.Socket>();
    private nextId = 1;

    // Accept queues: serverId -> list of promise resolvers waiting for connection
    private acceptWaiters = new Map<number, ((h: number) => void)[]>();
    // Pending connections: serverId -> list of socket handles ready to be accepted
    private acceptQueue = new Map<number, number[]>();

    // Read queues: socketId -> list of resolvers waiting for data
    private readWaiters = new Map<number, ((d: string) => void)[]>();
    // Buffered data: socketId -> string
    private readBuffer = new Map<number, string>();

    async listen(port: number): Promise<number | null> {
        return new Promise((resolve) => {
            const server = net.createServer((sock) => {
                const id = this.nextId++;
                this.sockets.set(id, sock);
                this.setupSocket(id, sock);

                const serverId = (server as any)._irisId;
                if (!serverId) return; // Should not happen

                const waiters = this.acceptWaiters.get(serverId) || [];
                if (waiters.length > 0) {
                    const waiter = waiters.shift();
                    waiter!(id);
                } else {
                    const q = this.acceptQueue.get(serverId) || [];
                    q.push(id);
                    this.acceptQueue.set(serverId, q);
                }
            });

            server.on('error', (err) => {
                resolve(null);
            });

            server.listen(port, () => {
                const id = this.nextId++;
                (server as any)._irisId = id;
                this.servers.set(id, server);
                this.acceptQueue.set(id, []);
                this.acceptWaiters.set(id, []);
                resolve(id);
            });
        });
    }

    async accept(serverHandle: number): Promise<number | null> {
        const server = this.servers.get(serverHandle);
        if (!server) return null;

        const q = this.acceptQueue.get(serverHandle) || [];
        if (q.length > 0) {
            const id = q.shift();
            return id!;
        }

        return new Promise((resolve) => {
            const waiters = this.acceptWaiters.get(serverHandle) || [];
            waiters.push((id) => resolve(id));
            this.acceptWaiters.set(serverHandle, waiters);
        });
    }

    private setupSocket(id: number, sock: net.Socket) {
        sock.on('data', (data) => {
            const str = data.toString();
            const waiters = this.readWaiters.get(id) || [];
            if (waiters.length > 0) {
                const waiter = waiters.shift();
                waiter!(str);
            } else {
                const current = this.readBuffer.get(id) || "";
                this.readBuffer.set(id, current + str);
            }
        });

        sock.on('close', () => {
            // Notify all waiters with null to signal connection closed
            const waiters = this.readWaiters.get(id) || [];
            for (const waiter of waiters) {
                waiter(null as any); // cast to any because signature expects string
            }
            this.readWaiters.delete(id);
            this.sockets.delete(id);
        });

        sock.on('error', () => { });
    }

    async connect(host: string, port: number): Promise<number | null> {
        return new Promise((resolve) => {
            const sock = net.createConnection(port, host);

            const onConnect = () => {
                const id = this.nextId++;
                this.sockets.set(id, sock);
                this.setupSocket(id, sock);
                resolve(id);
            };

            const onError = (_err: any) => {
                resolve(null);
            };

            sock.once('connect', onConnect);
            sock.once('error', onError);
        });
    }

    async read(handle: number): Promise<string | null> {
        const sock = this.sockets.get(handle);
        if (!sock) return null;

        const buf = this.readBuffer.get(handle);
        if (buf && buf.length > 0) {
            this.readBuffer.set(handle, ""); // clear
            return buf;
        }

        return new Promise((resolve) => {
            const waiters = this.readWaiters.get(handle) || [];
            waiters.push(resolve);
            this.readWaiters.set(handle, waiters);
        });
    }

    async write(handle: number, data: string): Promise<boolean> {
        const sock = this.sockets.get(handle);
        if (!sock) return false;
        return new Promise(resolve => {
            sock.write(data, (err) => {
                resolve(!err);
            });
        });
    }

    async close(handle: number): Promise<boolean> {
        if (this.servers.has(handle)) {
            const s = this.servers.get(handle)!;
            s.close();
            this.servers.delete(handle);
            return true;
        }
        if (this.sockets.has(handle)) {
            const s = this.sockets.get(handle)!;
            s.end();
            this.sockets.delete(handle);
            return true;
        }
        return false;
    }
}

export async function cli(args: string[]) {
    const debug = args.includes('--debug');
    const rawOutput = args.includes('--raw');
    const cleanArgs = args.filter(a => a !== '--debug' && a !== '--raw');

    const command = cleanArgs[0];
    const file = cleanArgs[1];

    if (!command || command === 'help') {
        printHelp();
        return;
    }

    if (command === 'version') {
        printVersion();
        return;
    }

    if (command === 'run' || command === 'check' || command === 'run-wasm') {
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
            },
            readDir: (p: string) => {
                try {
                    return fs.readdirSync(p);
                } catch {
                    return null;
                }
            }
        };

        const nodeNet = new NodeNetwork();

        if (command === 'run-wasm') {
            const wasmArgs = cleanArgs.slice(2);
            let noRun = false;
            let quiet = false;
            let printWat = false;
            let watOut: string | null = null;
            let wasmOut: string | null = null;
            let compilerOverride: string | null = null;
            let wasmProfile: 'host' | 'wasi' = 'host';

            for (let i = 0; i < wasmArgs.length; i++) {
                const arg = wasmArgs[i];
                if (arg === '--no-run') {
                    noRun = true;
                } else if (arg === '--quiet') {
                    quiet = true;
                } else if (arg === '--print-wat') {
                    printWat = true;
                } else if (arg === '--wat-out') {
                    watOut = wasmArgs[i + 1] ?? null;
                    i++;
                } else if (arg === '--wasm-out') {
                    wasmOut = wasmArgs[i + 1] ?? null;
                    i++;
                } else if (arg === '--compiler') {
                    compilerOverride = wasmArgs[i + 1] ?? null;
                    i++;
                } else if (arg === '--wasm-profile') {
                    const next = wasmArgs[i + 1];
                    if (next === 'host' || next === 'wasi') {
                        wasmProfile = next;
                    } else {
                        console.error('Error: --wasm-profile must be host or wasi.');
                        process.exit(1);
                    }
                    i++;
                }
            }

            const compilerPath = path.resolve(
                compilerOverride ?? path.resolve(__dirname, '../../examples/real/compiler/compiler.iris'),
            );
            if (!fs.existsSync(compilerPath)) {
                console.error(`Error: Compiler not found at ${compilerPath}`);
                process.exit(1);
            }

            warnIfStaleBuild(
                path.resolve(__dirname, './runtime/wasm_host.js'),
                path.resolve(__dirname, '../../src/runtime/wasm_host.ts'),
                'src/runtime/wasm_host.ts',
            );
            warnIfStaleBuild(
                path.resolve(__dirname, './cli.js'),
                path.resolve(__dirname, '../../src/cli.ts'),
                'src/cli.ts',
            );
            const compilerSource = fs.readFileSync(compilerPath, 'utf-8');
            const compilerModules = loadAllModulesRecursively(compilerPath);

            const compileArgs = [absolutePath, wasmProfile === 'wasi' ? 'wasm-wasi' : 'wasm'];
            const watResult = await run(compilerSource, nodeFs, compilerModules, nodeNet, compileArgs, debug);
            let wat = watResult;
            if (wat.startsWith('"') && wat.endsWith('"')) {
                try {
                    wat = JSON.parse(wat);
                } catch {
                    console.error('Error: Failed to parse compiler output.');
                    process.exit(1);
                }
            }

            let wasmBytes: Uint8Array;
            try {
                const wabt = await require('wabt')();
                const module = wabt.parseWat('module.wat', wat);
                const { buffer } = module.toBinary({ write_debug_names: true });
                wasmBytes = new Uint8Array(buffer);
            } catch (err: any) {
                console.error(`Error: Failed to compile WAT to wasm: ${err?.message ?? err}`);
                process.exit(1);
            }

            if (printWat) {
                console.log(wat);
            }
            if (watOut) {
                try {
                    fs.writeFileSync(path.resolve(watOut), wat, 'utf-8');
                } catch (err: any) {
                    console.error(`Error: Failed to write WAT: ${err?.message ?? err}`);
                    process.exit(1);
                }
            }
            if (wasmOut) {
                try {
                    fs.writeFileSync(path.resolve(wasmOut), Buffer.from(wasmBytes));
                } catch (err: any) {
                    console.error(`Error: Failed to write wasm: ${err?.message ?? err}`);
                    process.exit(1);
                }
            }

            if (wasmProfile === 'wasi' && !noRun) {
                console.error('Error: WASI profile selected. Use --no-run and run with wasmtime/wasmer.');
                process.exit(1);
            }

            if (noRun) {
                return;
            }

            const programArgs = wasmArgs.filter(a => !a.startsWith('--'));
            const host = new IrisWasmHost({ onPrint: (text) => console.log(text), args: programArgs });
            const importObj = host.getImportObject();
            try {
                const instantiated = await WebAssembly.instantiate(wasmBytes, importObj);
                const instResult = instantiated as unknown as WebAssembly.WebAssemblyInstantiatedSource;
                const instance = instResult.instance ?? (instantiated as WebAssembly.Instance);
                const memory = (instance.exports.memory as WebAssembly.Memory) ?? null;
                if (memory) host.attachMemory(memory);
                const main = instance.exports.main as (() => bigint) | undefined;
                if (!main) {
                    console.error('Error: wasm module does not export main.');
                    process.exit(1);
                }
                const res = main();
                if (!quiet) {
                    console.log(`main returned ${res}`);
                }
                return;
            } catch (err: any) {
                console.error(`Error: Failed to run wasm: ${err?.message ?? err}`);
                process.exit(1);
            }
        }

        const result = check(source, modules, debug);
        if (!result.success) {
            console.error(result.error);
            process.exit(1);
        }

        const programArgs = cleanArgs.slice(2);
        const runResult = await run(source, nodeFs, modules, nodeNet, programArgs, debug);
        if (runResult.startsWith('"') && runResult.endsWith('"')) {
            try {
                const raw = JSON.parse(runResult);
                if (rawOutput || (raw.startsWith('(module') && raw.trimEnd().endsWith(')'))) {
                    console.log(raw);
                    return;
                }
            } catch {
                // Fall through to default printing if parsing fails.
            }
        }
        console.log(runResult);

    } else {
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
}

if (require.main === module) {
    cli(process.argv.slice(2)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
