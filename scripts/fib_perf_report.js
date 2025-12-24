#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports');
const HISTORY_PATH = path.join(REPORT_DIR, 'fib_perf_history.json');
const REPORT_PATH = path.join(REPORT_DIR, 'fib_perf_report.md');

const IRIS_BIN = path.join(ROOT, 'bin', 'iris');
const FIB_PATH = path.join(ROOT, 'examples', 'real', 'apps', 'fib.iris');

const ALGOS = ['recursive', 'iterative', 'fast-doubling', 'matrix', 'memoized'];
const N = 35; // fixed between 35 and 50 for comparability
const RUNS = 2;

function readGitCommit() {
  try {
    const headPath = path.join(ROOT, '.git', 'HEAD');
    const head = fs.readFileSync(headPath, 'utf8').trim();
    if (head.startsWith('ref:')) {
      const refPath = head.replace('ref:', '').trim();
      const fullRef = path.join(ROOT, '.git', refPath);
      return fs.readFileSync(fullRef, 'utf8').trim();
    }
    return head;
  } catch {
    return 'unknown';
  }
}

function readVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function runOnce(backend, alg) {
  const args = backend === 'wasm'
    ? ['run-wasm', FIB_PATH, String(N), '--alg', alg, '--quiet']
    : ['run', FIB_PATH, String(N), '--alg', alg];
  const start = process.hrtime.bigint();
  const res = spawnSync(IRIS_BIN, args, { cwd: ROOT, stdio: 'pipe' });
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString('utf8') : '';
    throw new Error(`fib run failed for ${backend}/${alg}: ${stderr || 'unknown error'}`);
  }
  return ms;
}

function stats(samples) {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { min, max, mean };
}

function bar(value, maxValue) {
  if (maxValue <= 0) return '';
  const width = 24;
  const count = Math.max(1, Math.round((value / maxValue) * width));
  return '#'.repeat(count);
}

function readHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n');
}

function writeReport(latest, history) {
  const backends = Object.keys(latest.backends);
  const lines = [];
  lines.push('# Fib Performance Report');
  lines.push('');
  lines.push(`- Timestamp: ${latest.timestamp}`);
  lines.push(`- Iris version: ${latest.irisVersion}`);
  lines.push(`- Git commit: ${latest.gitCommit}`);
  lines.push(`- N: ${latest.n}`);
  lines.push('');
  for (const backend of backends) {
    const current = latest.backends[backend];
    const maxMean = Math.max(...current.map(a => a.meanMs));
    lines.push(`## Latest Run (${backend})`);
    lines.push('');
    lines.push('| Algorithm | Mean (ms) | Min (ms) | Max (ms) | Histogram |');
    lines.push('| --- | ---: | ---: | ---: | --- |');
    for (const alg of current) {
      lines.push(`| ${alg.name} | ${alg.meanMs.toFixed(2)} | ${alg.minMs.toFixed(2)} | ${alg.maxMs.toFixed(2)} | ${bar(alg.meanMs, maxMean)} |`);
    }
    lines.push('');
  }
  lines.push('## History');
  lines.push('');
  lines.push('| Timestamp | Version | Commit | N | Fastest (ts) | Slowest (ts) | Fastest (wasm) | Slowest (wasm) |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |');
  for (const entry of history.slice(-20).reverse()) {
    const ts = entry.backends?.ts || entry.algorithms || [];
    const wasm = entry.backends?.wasm || [];
    const tsMeans = ts.map(a => a.meanMs);
    const wasmMeans = wasm.map(a => a.meanMs);
    const fastestTs = tsMeans.length ? Math.min(...tsMeans).toFixed(2) : '-';
    const slowestTs = tsMeans.length ? Math.max(...tsMeans).toFixed(2) : '-';
    const fastestWasm = wasmMeans.length ? Math.min(...wasmMeans).toFixed(2) : '-';
    const slowestWasm = wasmMeans.length ? Math.max(...wasmMeans).toFixed(2) : '-';
    lines.push(`| ${entry.timestamp} | ${entry.irisVersion} | ${entry.gitCommit.slice(0, 8)} | ${entry.n} | ${fastestTs} | ${slowestTs} | ${fastestWasm} | ${slowestWasm} |`);
  }
  lines.push('');
  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
}

function main() {
  if (!fs.existsSync(IRIS_BIN)) {
    console.error(`Missing ${IRIS_BIN}. Run npm run build first.`);
    process.exit(1);
  }
  if (!fs.existsSync(FIB_PATH)) {
    console.error(`Missing ${FIB_PATH}.`);
    process.exit(1);
  }

  const backends = ['ts', 'wasm'];
  const resultsByBackend = {};
  for (const backend of backends) {
    const results = [];
    for (const alg of ALGOS) {
      const samples = [];
      for (let i = 0; i < RUNS; i++) {
        samples.push(runOnce(backend, alg));
      }
      const { min, max, mean } = stats(samples);
      results.push({ name: alg, samplesMs: samples, minMs: min, maxMs: max, meanMs: mean });
    }
    resultsByBackend[backend] = results;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    irisVersion: readVersion(),
    gitCommit: readGitCommit(),
    n: N,
    backends: resultsByBackend,
  };

  const history = readHistory();
  history.push(entry);
  writeHistory(history);
  writeReport(entry, history);

  console.log(`Wrote ${REPORT_PATH}`);
}

main();
