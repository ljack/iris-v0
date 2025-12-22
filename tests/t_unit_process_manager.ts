import { TestCase } from '../src/test-types';
import { ProcessManager } from '../src/runtime/process';

export const t_unit_process_manager: TestCase = {
    name: 'Unit: ProcessManager message flow',
    fn: async () => {
        const pm = ProcessManager.instance;

        // Case 1: queue a message before recv
        pm.reset();
        const pid = pm.getNextPid();
        pm.register(pid);
        const sentBeforeRecv = pm.send(pid, 'queued');
        if (!sentBeforeRecv) {
            throw new Error('Expected send to succeed for registered PID');
        }
        const queuedResult = await pm.recv(pid);
        if (queuedResult !== 'queued') {
            throw new Error(`Expected queued message, got ${queuedResult}`);
        }

        // Case 2: receiver waiting before send
        pm.reset();
        const pidWaiting = pm.getNextPid();
        pm.register(pidWaiting);
        const waitingRecv = pm.recv(pidWaiting);
        const sendWhileWaiting = pm.send(pidWaiting, 'wake');
        if (!sendWhileWaiting) {
            throw new Error('Expected send to succeed while receiver waits');
        }
        const waitingRace = await Promise.race([
            waitingRecv.then(msg => ({ status: 'resolved', msg })),
            new Promise(resolve => setTimeout(() => resolve({ status: 'timeout' }), 50))
        ]) as { status: 'resolved' | 'timeout'; msg?: string };
        if (waitingRace.status !== 'resolved') {
            throw new Error('Expected waiting receiver to resolve immediately after send');
        }
        if (waitingRace.msg !== 'wake') {
            throw new Error(`Expected waiting receiver to resolve with "wake", got ${waitingRace.msg}`);
        }
        const pendingRecv = pm.recv(pidWaiting);
        const raceResult = await Promise.race([
            pendingRecv.then(() => 'resolved'),
            new Promise(resolve => setTimeout(() => resolve('timeout'), 50))
        ]);
        if (raceResult !== 'timeout') {
            throw new Error('Expected no queued messages after waking receiver');
        }
        pm.send(pidWaiting, 'cleanup');
        await pendingRecv;

        // Case 3: sending to unknown PID
        pm.reset();
        const unknownSend = pm.send(12345, 'none');
        if (unknownSend !== false) {
            throw new Error('Expected send to unknown PID to return false');
        }
    }
};
