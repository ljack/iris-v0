
const { Worker } = require('worker_threads');
const path = require('path');

console.log("Starting T144 Worker Wrapper with 512MB stack...");

const worker = new Worker(`
    console.log("Worker: Thread started.");
    process.env.TS_NODE_TRANSPILE_ONLY = 'true';
    require('ts-node').register();
    console.log("Worker: ts-node registered.");
    const { t144 } = require('./tests/t144.ts');
    console.log("Worker: t144 imported.");
    t144.fn().then(() => {
        console.log("Worker: Task finished successfully.");
        process.exit(0);
    }).catch(err => {
        console.error("Worker: Task failed:", err);
        process.exit(1);
    });
`, {
    eval: true,
    resourceLimits: { stackSizeMb: 512 },
    stderr: true,
    stdout: true
});

worker.stdout.pipe(process.stdout);
worker.stderr.pipe(process.stderr);

worker.on('exit', (code) => {
    process.exit(code);
});

worker.on('error', (err) => {
    console.error("Worker Error:", err);
    process.exit(1);
});
