
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { run, check } from './main';
import { INetwork } from './eval';

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

                // Check if anyone waiting for accept
                // Get server handle. Wait, we need to know WHICH server this sock belongs to.
                // net.createServer callback doesn't give server instance easily unless captured?
                // Actually server instance is `server`.
                // We need to map `server` instance to `serverId`.
                // Inefficient search? Or reverse map?
                // Let's store serverId on server object?
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

    /*
     * Note: This `read` implementation is simplistic.
     * It waits for ANY chunk. 
     * Or consumes buffer.
     */
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
        // Hook `Interpreter` creation in `run`. 
        // `run` method in `main.ts` creates Interpreter, but it does NOT expose a way to inject `net` dependency yet?
        // Wait, I didn't update `run` to accept `INetwork`.
        // I should update `eval.ts` Interpreter constructor to take `net` (done).
        // I should update `main.ts` `run` to take `net`.

        // Wait, `run` in `main.ts` takes `fsMap`. It should also take `net` or `services`.
        // I will assume for now I will modify `main.ts` AGAIN or just instantiate Interpreter manually here?
        // `run` does: Parse -> Typecheck -> Interpret.
        // I should update `run`.

        // For now, I will use `run` but I need to pass `net`.
        // I'll update `main.ts` signature before running this code.
        // Assuming `main.ts` handles it. Or I duplicate logic here?
        // Duplicating logic here is safer for `cli` specific dependency injection.

        const result = check(source, modules);
        if (!result.success) {
            console.error(result.error);
            process.exit(1);
        }

        // Manual interpretation instead of calling `run` (or update `run`). 
        // Let's instantiate Interpreter directly.
        // We need `Interpreter` import.
        // `Interpreter` is exported from `eval`.
        // But `main.ts` exports `run` which does everything.
        // If I update `run` signature in `main.ts` I can pass `net`.
        // Let's assume I will update `main.ts` next.

        // But wait, I'm writing `cli.ts` NOW.
        // I'll use `(run as any)(source, nodeFs, modules, nodeNet)` and fix `main.ts` to match.

        console.log(await (run as any)(source, nodeFs, modules, nodeNet));

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
