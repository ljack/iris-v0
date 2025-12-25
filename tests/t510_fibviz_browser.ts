import { spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { TestCase } from '../src/test-types';

type Response = { header: string; body: Buffer };

function request(port: number, pathname: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const chunks: Buffer[] = [];
    client.connect(port, '127.0.0.1', () => {
      client.write(`GET ${pathname} HTTP/1.1\r\nHost: localhost\r\n\r\n`);
    });
    client.on('data', (data) => chunks.push(Buffer.from(data)));
    client.on('error', reject);
    client.on('end', () => {
      const raw = Buffer.concat(chunks);
      const split = raw.indexOf('\r\n\r\n');
      if (split === -1) {
        reject(new Error('Invalid HTTP response'));
        return;
      }
      const header = raw.slice(0, split).toString('utf-8');
      const body = raw.slice(split + 4);
      resolve({ header, body });
    });
  });
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to acquire free port'));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
  });
}

export const t510_fibviz_browser: TestCase = {
  name: 't510_fibviz_browser',
  fn: async () => {
    if (!process.env.IRIS_FIBVIZ_WEB) {
      console.log('Skipping fibviz browser test (set IRIS_FIBVIZ_WEB=1 to enable).');
      return;
    }

    const root = path.resolve(__dirname, '..');
    const binPath = path.resolve(root, 'bin/iris');
    const port = await findFreePort();
    const server = spawn(binPath, ['run', 'examples/real/apps/fibviz_server.iris', String(port)], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderrText = '';
    server.stderr?.on('data', (data) => {
      stderrText += data.toString();
    });

    const ready = new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const deadline = started + 5000;

        const tryConnect = () => {
        const client = new net.Socket();
        client.once('error', () => {
          client.destroy();
          if (Date.now() > deadline) {
            reject(new Error(`fibviz server timeout${stderrText ? `\n${stderrText}` : ''}`));
          } else {
            setTimeout(tryConnect, 100);
          }
        });
        client.connect(port, '127.0.0.1', () => {
          client.end();
          resolve();
        });
      };

      server.stderr?.on('data', (data) => {
        const text = data.toString();
        if (text.toLowerCase().includes('failed')) {
          reject(new Error(`fibviz server error: ${text}`));
        }
      });

      tryConnect();
    });

    try {
      await ready;

      const indexRes = await request(port, '/');
      if (!indexRes.header.includes('200 OK')) {
        throw new Error(`Expected 200 for /, got: ${indexRes.header}`);
      }
      if (!indexRes.header.includes('Content-Type: text/html')) {
        throw new Error(`Expected text/html for /, got: ${indexRes.header}`);
      }
      if (!indexRes.body.toString('utf-8').includes('<!doctype html>')) {
        throw new Error('Expected HTML body for /');
      }

      const wasmRes = await request(port, '/fib_viz.wasm.b64');
      if (!wasmRes.header.includes('200 OK')) {
        throw new Error(`Expected 200 for wasm, got: ${wasmRes.header}`);
      }
      if (!wasmRes.header.includes('Content-Type: text/plain')) {
        throw new Error(`Expected text/plain for wasm.b64, got: ${wasmRes.header}`);
      }
      const b64 = wasmRes.body.toString('utf-8').trim();
      if (b64.length < 16) {
        throw new Error('Expected wasm base64 content');
      }
      const decoded = Buffer.from(b64, 'base64');
      const magic = decoded.slice(0, 4).toString('binary');
      if (magic !== '\0asm') {
        throw new Error('Expected wasm magic header');
      }
    } finally {
      server.kill();
    }
  },
};
