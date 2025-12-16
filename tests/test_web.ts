
import { BrowserFileSystem, BrowserNetwork } from '../src/platform/browser';
import { runIris } from '../src/web-entry';
import { IFileSystem } from '../src/eval';

const test = async () => {
    console.log("Running Web Playground Tests...");
    let failed = false;

    // Test 1: Filesystem Adapter
    try {
        const fs = new BrowserFileSystem();
        fs.writeFile("test.txt", "Hello FS");
        const read = fs.readFile("test.txt");
        if (read !== "Hello FS") throw new Error(`Expected 'Hello FS', got '${read}'`);

        const exists = fs.exists("test.txt");
        if (!exists) throw new Error("Expected file to exist");

        const notExists = fs.exists("ghost.txt");
        if (notExists) throw new Error("Expected ghost file to not exist");

        console.log("✅ FS Adapter Test Passed");
    } catch (e: any) {
        console.error("❌ FS Adapter Test Failed:", e.message);
        failed = true;
    }

    // Test 2: Network Adapter (Mock)
    try {
        const net = new BrowserNetwork();
        const server = await net.listen(8080);
        if (server !== 1) throw new Error("Expected server handle 1");
        console.log("✅ Network Adapter Test Passed");
    } catch (e: any) {
        console.error("❌ Network Adapter Test Failed:", e.message);
        failed = true;
    }

    // Test 3: runIris Integration (Hello World)
    try {
        // Need to mock window for web-entry? No, we guarded it.
        // But runIris uses console.log capture which we can verify by return value.
        const source = `(program 
            (module (name "test") (version 0)) 
            (defs (deffn (name main) (args) (ret I64) (eff !IO) 
                (body (let (_ (io.print "Web Test")) 0))))
        )`;

        const output = await runIris(source);
        // Expect outputBuffer to have "Web Test" and "=> 0"
        if (!output.includes("Web Test")) throw new Error("Output missing 'Web Test'");
        if (!output.includes("=> 0")) throw new Error("Output missing result '=> 0'");

        console.log("✅ runIris Test Passed");
    } catch (e: any) {
        console.error("❌ runIris Test Failed:", e.message);
        failed = true;
    }

    if (failed) process.exit(1);
};

test();
