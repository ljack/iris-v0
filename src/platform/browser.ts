
import { IFileSystem, INetwork, IToolHost } from '../eval';
import { ToolRegistry, jsToValue, valueToJs } from '../runtime/tool-host';
import { Value } from '../types';

export class BrowserFileSystem implements IFileSystem {
    private files: Map<string, string> = new Map();

    readFile(path: string): string | null {
        if (!this.files.has(path)) {
            return null;
        }
        return this.files.get(path) || "";
    }

    writeFile(path: string, content: string): boolean {
        this.files.set(path, content);
        return true;
    }

    exists(path: string): boolean {
        return this.files.has(path);
    }

    readDir(path: string): string[] | null {
        // Simple prefix match simulation
        const results: string[] = [];
        for (const key of this.files.keys()) {
            if (key.startsWith(path)) {
                results.push(key);
            }
        }
        return results;
    }
}

export class BrowserNetwork implements INetwork {
    async listen(port: number): Promise<number> {
        console.log(`[BrowserNet] Mock listening on port ${port}`);
        return 1; // Mock handle
    }

    async accept(serverHandle: number): Promise<number> {
        console.log(`[BrowserNet] Waiting for connection... (Mock: Returning immediately)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 2; // Mock client handle
    }

    async read(handle: number): Promise<string> {
        return "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";
    }

    async write(handle: number, data: string): Promise<boolean> {
        console.log(`[BrowserNet] Writing to ${handle}:`);
        console.log(data);
        return true;
    }

    async connect(host: string, port: number): Promise<number | null> {
        console.warn("net.connect not supported in browser");
        return null;
    }

    async close(handle: number): Promise<boolean> {
        console.log(`[BrowserNet] Closed handle ${handle}`);
        return true;
    }
}

export class BrowserToolHost implements IToolHost {
    constructor(private tools: ToolRegistry = {}) { }

    async callTool(name: string, args: Value[]): Promise<Value> {
        const fn = this.tools[name];
        if (!fn) throw new Error(`Tool not found: ${name}`);
        const result = await fn(...args.map(valueToJs));
        return jsToValue(result);
    }

    callToolSync(name: string, args: Value[]): Value {
        const fn = this.tools[name];
        if (!fn) throw new Error(`Tool not found: ${name}`);
        const result = fn(...args.map(valueToJs));
        return jsToValue(result);
    }
}
