
import { run } from './main';
import { BrowserFileSystem, BrowserNetwork, BrowserToolHost } from './platform/browser';
import { IFileSystem, IToolHost } from './eval';
import { ToolRegistry } from './runtime/tool-host';

declare var window: any;

function resolveToolHost(tools?: ToolRegistry | IToolHost): IToolHost | undefined {
    if (tools) {
        if (typeof (tools as IToolHost).callTool === 'function') return tools as IToolHost;
        return new BrowserToolHost(tools as ToolRegistry);
    }

    if (typeof window === 'undefined') return undefined;

    const globalHost = (window as any).irisToolHost as IToolHost | undefined;
    if (globalHost && typeof globalHost.callTool === 'function') return globalHost;

    const registry = (window as any).irisTools as ToolRegistry | undefined;
    if (registry && typeof registry === 'object') return new BrowserToolHost(registry);

    return undefined;
}

export async function runIris(source: string, tools?: ToolRegistry | IToolHost): Promise<string> {
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
        const toolHost = resolveToolHost(tools);
        const resultVal = await run(source, fs as IFileSystem, {}, net, [], false, toolHost);

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
