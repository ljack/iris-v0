
import { runWithStack } from './worker_launcher';
import * as path from 'path';

async function main() {
    console.log("Probing Stack Size in Worker...");
    const workerPath = path.join(__dirname, 'probe_worker.ts');

    const res1: any = await runWithStack(workerPath, {}, 1); // 1MB
    console.log("1MB Stack Depth:", res1.depth);

    const res2: any = await runWithStack(workerPath, {}, 128); // 128MB
    console.log("128MB Stack Depth:", res2.depth);
}

main();
