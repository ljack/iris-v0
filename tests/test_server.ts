
import { spawn } from 'child_process';
import * as path from 'path';
import * as net from 'net';

const BIN_PATH = path.resolve(__dirname, '../bin/iris');
// Spawn server
console.log("Starting server...");
const server = spawn(BIN_PATH, ['run', 'examples/real/apps/http_server.iris'], { cwd: path.resolve(__dirname, '..') });

server.stdout.on('data', (data) => console.log(`[Server]: ${data}`));
server.stderr.on('data', (data) => console.error(`[Server Err]: ${data}`));

setTimeout(() => {
    // Connect to 8080
    const client = new net.Socket();
    client.connect(8080, '127.0.0.1', () => {
        console.log('Connected to server');
        client.write('GET /hello_full.iris HTTP/1.1\r\nHost: localhost\r\n\r\n');
    });

    client.on('data', (data) => {
        console.log('Received: ' + data);
        if (data.toString().includes('Hello from CLI!')) {
            console.log('✅ PASS: Served hello_full.iris');
        } else {
            console.log('❌ FAIL: Content match');
        }
        client.destroy();
        server.kill();
        process.exit(0);
    });

    // Test index
    /*
    const client2 = new net.Socket();
    client2.connect(8080, '127.0.0.1', () => {
         client2.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n');
    });
    client2.on('data', (d) => ...);
    */

}, 2000); // Wait for server to start

setTimeout(() => {
    console.error("Timeout");
    server.kill();
    process.exit(1);
}, 5000);
