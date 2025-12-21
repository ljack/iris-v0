import { TestCase } from '../src/test-types';
import { run } from '../src/main';
import * as fs from 'fs';
import * as path from 'path';
import { IFileSystem } from '../src/eval';

const curlSource = fs.readFileSync(
  path.resolve(__dirname, '../examples/real/apps/iris_curl.iris'),
  'utf8',
);

const modules = {
  '../../../stdlib/http': fs.readFileSync(
    path.resolve(__dirname, '../stdlib/http.iris'),
    'utf8',
  ),
  '../../../stdlib/pretty': fs.readFileSync(
    path.resolve(__dirname, '../stdlib/pretty.iris'),
    'utf8',
  ),
};

export const t500_curl_get: TestCase = {
  name: 'Test 500: iris_curl GET',
  fn: async () => {
    const outputBuffer: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => outputBuffer.push(msg);

    try {
      const result = await run(curlSource, {}, modules, undefined, [
        'http://example.com',
      ]);
      if (result !== '(Ok "Success")') {
        throw new Error(`Expected Ok result, got ${result}`);
      }
    } finally {
      console.log = originalLog;
    }

    const expected = ['HTTP/1.1 200', '(no headers)', 'OK'];
    const actual = outputBuffer.slice(0, expected.length);
    if (actual.join('\n') !== expected.join('\n')) {
      throw new Error(`Unexpected output: ${actual.join('\\n')}`);
    }
  },
};

export const t501_curl_head: TestCase = {
  name: 'Test 501: iris_curl -I',
  fn: async () => {
    const outputBuffer: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => outputBuffer.push(msg);

    try {
      const result = await run(curlSource, {}, modules, undefined, [
        '-I',
        'http://example.com',
      ]);
      if (result !== '(Ok "Success")') {
        throw new Error(`Expected Ok result, got ${result}`);
      }
    } finally {
      console.log = originalLog;
    }

    const expected = ['HTTP/1.1 200', '(no headers)'];
    const actual = outputBuffer.slice(0, expected.length);
    if (actual.join('\n') !== expected.join('\n')) {
      throw new Error(`Unexpected output: ${actual.join('\\n')}`);
    }
  },
};

export const t502_curl_output: TestCase = {
  name: 'Test 502: iris_curl -o',
  fn: async () => {
    const outputBuffer: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => outputBuffer.push(msg);

    const writes: Record<string, string> = {};
    const fsMock: IFileSystem = {
      readFile: () => null,
      writeFile: (p, content) => {
        writes[p] = content;
        return true;
      },
      exists: (p) => p in writes,
    };

    try {
      const result = await run(curlSource, fsMock, modules, undefined, [
        '-o',
        'out.txt',
        'http://example.com',
      ]);
      if (result !== '(Ok "Success")') {
        throw new Error(`Expected Ok result, got ${result}`);
      }
    } finally {
      console.log = originalLog;
    }

    if (writes['out.txt'] !== 'OK') {
      throw new Error(`Expected out.txt to contain OK, got ${writes['out.txt']}`);
    }
    const expected = ['HTTP/1.1 200', '(no headers)', 'Saved to out.txt'];
    const actual = outputBuffer.slice(0, expected.length);
    if (actual.join('\n') !== expected.join('\n')) {
      throw new Error(`Unexpected output: ${actual.join('\\n')}`);
    }
  },
};

export const t503_curl_live_get: TestCase = {
  name: 'Test 503: iris_curl live GET (optional)',
  fn: async () => {
    if (!process.env.IRIS_LIVE_HTTP) {
      return;
    }
    const outputBuffer: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => outputBuffer.push(msg);

    try {
      const result = await run(curlSource, {}, modules, undefined, [
        '-I',
        'https://postman-echo.com/get?foo=bar',
      ]);
      if (!result.startsWith('(Ok ')) {
        throw new Error(`Expected Ok result, got ${result}`);
      }
    } finally {
      console.log = originalLog;
    }

    if (!outputBuffer.some((line) => line.includes('HTTP/1.1'))) {
      throw new Error('Expected HTTP response line in output');
    }
  },
};

export const t504_curl_live_post: TestCase = {
  name: 'Test 504: iris_curl live POST (optional)',
  fn: async () => {
    if (!process.env.IRIS_LIVE_HTTP) {
      return;
    }
    const outputBuffer: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => outputBuffer.push(msg);

    try {
      const result = await run(curlSource, {}, modules, undefined, [
        '-I',
        '-d',
        'hello=world',
        'https://postman-echo.com/post',
      ]);
      if (!result.startsWith('(Ok ')) {
        throw new Error(`Expected Ok result, got ${result}`);
      }
    } finally {
      console.log = originalLog;
    }

    if (!outputBuffer.some((line) => line.includes('HTTP/1.1'))) {
      throw new Error('Expected HTTP response line in output');
    }
  },
};
