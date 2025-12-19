
import { IFileSystem, INetwork } from './interfaces';

export class MockFileSystem implements IFileSystem {
    constructor(private data: Record<string, string>) { }
    readFile(path: string) { return this.data[path] ?? null; }
    writeFile(path: string, content: string) { this.data[path] = content; return true; }
    exists(path: string) { return path in this.data; }
    readDir(path: string) {
        if (path === '.') return Object.keys(this.data);
        return Object.keys(this.data).filter(k => k.startsWith(path + '/'));
    }
}

export class MockNetwork implements INetwork {
    async listen(port: number) { return 1; }
    async accept(h: number) { return 2; } // Return a client handle
    async read(h: number) { return "GET / HTTP/1.1\r\n\r\n"; }
    async write(h: number, d: string) { return true; }
    async close(h: number) { return true; }
    async connect(host: string, port: number) { return 3; }
}
