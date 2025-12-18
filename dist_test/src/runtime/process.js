export class ProcessManager {
    constructor() {
        this.nextPid = 1;
        this.mailboxes = new Map();
        this.receivers = new Map();
    }
    reset() {
        this.nextPid = 1;
        this.mailboxes.clear();
        this.receivers.clear();
    }
    getNextPid() {
        return this.nextPid++;
    }
    // Spawn a new process context (just registers it)
    register(pid) {
        this.mailboxes.set(pid, []);
        this.receivers.set(pid, []);
    }
    send(toPid, msg) {
        if (!this.mailboxes.has(toPid))
            return false;
        const waiting = this.receivers.get(toPid);
        if (waiting && waiting.length > 0) {
            // Wake up one receiver immediately
            const resolve = waiting.shift();
            resolve(msg);
        }
        else {
            // Queue message
            this.mailboxes.get(toPid).push(msg);
        }
        return true;
    }
    async recv(pid) {
        if (!this.mailboxes.has(pid))
            throw new Error(`Process ${pid} not registered`);
        const mailbox = this.mailboxes.get(pid);
        if (mailbox.length > 0) {
            return mailbox.shift();
        }
        // Suspend
        return new Promise((resolve) => {
            const waiting = this.receivers.get(pid);
            waiting.push(resolve);
        });
    }
}
ProcessManager.instance = new ProcessManager();
