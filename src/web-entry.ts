
import { run } from './main';
import { BrowserFileSystem, BrowserNetwork } from './platform/browser';
import { IFileSystem } from './eval';

declare var window: any;

export async function runIris(source: string): Promise<string> {
    const outputBuffer: string[] = [];
    const originalLog = console.log;

    // Capture console.log
    console.log = (...args: any[]) => {
        outputBuffer.push(args.map(a => String(a)).join(' '));
        originalLog(...args);
    };

    try {
        const fs = new BrowserFileSystem();
        const net = new BrowserNetwork();

        // We can pass empty modules for now, or pre-load them if needed
        // Explicitly cast fs to IFileSystem to avoid TS confusion with Record type
        const resultVal = await run(source, fs as IFileSystem, {}, net);

        // Final output is combination of side-effect prints + return value
        if (resultVal.startsWith("RuntimeError:") || resultVal.startsWith("TypeError:") || resultVal.startsWith("ParseError:")) {
            outputBuffer.push(resultVal); // Error is usually the return string
        } else {
            outputBuffer.push(`=> ${resultVal}`);
        }

        return outputBuffer.join('\n');
    } catch (e: any) {
        return `Unexpected Error: ${e.message}`;
    } finally {
        console.log = originalLog;
    }
}

// Expose to window if available
if (typeof window !== 'undefined') {
    (window as any).runIris = runIris;
}
