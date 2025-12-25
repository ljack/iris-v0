import { test, expect } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';

async function findFreePort(): Promise<number> {
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

async function waitForPort(port: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const client = new net.Socket();
      client.once('error', () => {
        client.destroy();
        if (Date.now() > deadline) {
          reject(new Error('fibviz server timeout'));
        } else {
          setTimeout(tryConnect, 100);
        }
      });
      client.connect(port, '127.0.0.1', () => {
        client.end();
        resolve();
      });
    };
    tryConnect();
  });
}

test('fibviz renders and produces metrics', async ({ page }) => {
  const root = path.resolve(__dirname, '../..');
  execSync(path.join(root, 'scripts', 'build_fib_viz_wasm.sh'), { stdio: 'inherit' });

  const port = await findFreePort();
  const binPath = path.join(root, 'bin', 'iris');
  const server = spawn(binPath, ['run', 'examples/real/apps/fibviz_server.iris', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForPort(port);
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });

    await expect(page.locator('h1')).toContainText('Fibonacci Algorithms');
    await expect(page.locator('#runBtn')).toBeVisible();

    await page.click('#runBtn');

    await page.waitForFunction(() => document.querySelectorAll('#metrics .metric').length > 0, null, {
      timeout: 20_000,
    });
    await expect(page.locator('#log')).toContainText('METRIC', { timeout: 20_000 });
    await expect(page.locator('.chart-meta').first()).toContainText('x: step');
    await page.selectOption('#xMode', 'depth');
    await expect(page.locator('.chart-meta').first()).toContainText('x: depth');

    const artifactsDir = path.join(root, 'artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactsDir, 'fibviz.png'), fullPage: true });
  } finally {
    server.kill();
  }
});
