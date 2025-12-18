
import { parentPort, workerData } from 'worker_threads';

function probe(depth: number): number {
    try {
        return probe(depth + 1);
    } catch (e) {
        return depth;
    }
}

async function run() {
    const depth = probe(1);
    parentPort?.postMessage({ success: true, depth: depth });
}

run();
