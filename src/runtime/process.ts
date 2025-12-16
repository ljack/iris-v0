
export class ProcessManager {
    static instance = new ProcessManager();

    private nextPid = 1;
    private mailboxes = new Map<number, string[]>();
    private receivers = new Map<number, ((msg: string) => void)[]>();

    reset() {
        this.nextPid = 1;
        this.mailboxes.clear();
        this.receivers.clear();
    }

    getNextPid(): number {
        return this.nextPid++;
    }

    // Spawn a new process context (just registers it)
    register(pid: number) {
        this.mailboxes.set(pid, []);
        this.receivers.set(pid, []);
    }

    send(toPid: number, msg: string): boolean {
        if (!this.mailboxes.has(toPid)) return false;

        const waiting = this.receivers.get(toPid);
        if (waiting && waiting.length > 0) {
            // Wake up one receiver immediately
            const resolve = waiting.shift();
            resolve!(msg);
        } else {
            // Queue message
            this.mailboxes.get(toPid)!.push(msg);
        }
        return true;
    }

    async recv(pid: number): Promise<string> {
        if (!this.mailboxes.has(pid)) throw new Error(`Process ${pid} not registered`);

        const mailbox = this.mailboxes.get(pid)!;
        if (mailbox.length > 0) {
            return mailbox.shift()!;
        }

        // Suspend
        return new Promise<string>((resolve) => {
            const waiting = this.receivers.get(pid)!;
            waiting.push(resolve);
        });
    }
}
