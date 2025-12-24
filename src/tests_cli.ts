import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const BIN_PATH = path.resolve(__dirname, '../bin/iris');
const EXAMPLES_DIR = path.resolve(__dirname, '../examples_test');

if (!fs.existsSync(EXAMPLES_DIR)) fs.mkdirSync(EXAMPLES_DIR);

function runCli(args: string): Promise<{ stdout: string, stderr: string, code: number }> {
    return new Promise(resolve => {
        exec(`${BIN_PATH} ${args}`, { cwd: EXAMPLES_DIR }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                code: error ? error.code || 1 : 0
            });
        });
    });
}

async function test() {
    let passed = 0;
    let failed = 0;

    const assert = (name: string, condition: boolean, msg?: string) => {
        if (condition) {
            console.log(`✅ PASS ${name}`);
            passed++;
        } else {
            console.error(`❌ FAILED ${name}: ${msg}`);
            failed++;
        }
    };

    // 1. Version
    const v = await runCli('version');
    assert('CLI Version', v.stdout === 'IRIS v0.4.0', `Expected 'IRIS v0.4.0', got '${v.stdout}'`);

    // 2. Help
    const h = await runCli('help');
    assert('CLI Help', h.stdout.includes('Usage: iris'), 'Output should contain usage info');

    // 3. Run Hello World (create file first)
    const helloPath = path.join(EXAMPLES_DIR, 'hello.iris');
    fs.writeFileSync(helloPath, '(program (module (name "hello") (version 0)) (defs (deffn (name main) (args) (ret I64) (eff !IO) (body (io.print "Hello CLI")))))');

    const runHello = await runCli(`run hello.iris`);
    assert('CLI Run Hello', runHello.stdout === 'Hello CLI\n0' || runHello.stdout === 'Hello CLI\n0', `Got: ${JSON.stringify(runHello.stdout)}`);
    // Note: stdout might vary on newlines, flexible check or fix io.print logic. 
    // Our io.print adds newline? console.log adds newline. 
    // "Hello CLI" \n "0" 
    // expected: "Hello CLI\n0"

    // 4. Check Hello World
    const checkHello = await runCli(`check hello.iris`);
    assert('CLI Check Hello', checkHello.stdout.includes('No type errors'), `Got: ${checkHello.stdout}`);

    // 4b. Format Hello World
    const formatHello = await runCli(`format hello.iris`);
    assert(
        'CLI Format Hello',
        formatHello.stdout.startsWith('(program') && formatHello.stdout.includes('(defs'),
        `Got: ${formatHello.stdout}`,
    );

    // 4c. View Hello World
    const viewHello = await runCli(`view hello.iris`);
    assert(
        'CLI View Hello',
        viewHello.stdout.includes('program') && viewHello.stdout.includes('defn main'),
        `Got: ${viewHello.stdout}`,
    );

    // 5. Run Missing File
    const missing = await runCli('run ghost.iris');
    assert('CLI Missing File', missing.code !== 0 && missing.stderr.includes('File not found'), `Should fail. Stderr: ${missing.stderr}`);

    // 6. Check Syntax Error
    const badPath = path.join(EXAMPLES_DIR, 'bad.iris');
    fs.writeFileSync(badPath, '(program (module (name "bad")) (defs'); // incomplete
    const checkBad = await runCli(`check bad.iris`);
    assert('CLI Check Bad', checkBad.code !== 0 && (checkBad.stdout.includes('ParseError') || checkBad.stderr.includes('ParseError')), `Should output ParseError. Stdout: ${checkBad.stdout} Stderr: ${checkBad.stderr}`);

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    // Cleanup
    if (fs.existsSync(helloPath)) fs.unlinkSync(helloPath);
    if (fs.existsSync(badPath)) fs.unlinkSync(badPath);
    if (fs.existsSync(EXAMPLES_DIR)) fs.rmdirSync(EXAMPLES_DIR);

    if (failed > 0) process.exit(1);
}

test();
