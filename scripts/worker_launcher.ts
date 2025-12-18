
import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
import * as path from 'path';

/**
 * Runs a function in a worker thread with a massive stack size.
 * This is necessary for bootstrapping the Iris compiler which has very deep recursion.
 */
export async function runWithStack(scriptPath: string, data: any, stackSizeMb: number = 128): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(scriptPath, {
            workerData: data,
            resourceLimits: {
                stackSizeMb: stackSizeMb
            },
            // We need to support ts-node in the worker as well
            execArgv: ['-r', 'ts-node/register']
        });

        worker.on('error', (err) => {
            reject(err);
        });
        worker.on('message', (response) => {
            if (response.success) {
                resolve(response);
            } else {
                // Create an error with the remote stack trace
                const err = new Error(response.error);
                err.stack = response.stack || response.error;
                reject(err);
            }
        });
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}
