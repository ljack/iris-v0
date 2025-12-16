
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/web-entry.ts'],
    bundle: true,
    outfile: 'web/iris.js',
    format: 'iife',     // Immediately Invoked Function Expression (good for browser <script>)
    globalName: 'IrisBundle',
    platform: 'browser',
    sourcemap: true,
}).catch(() => process.exit(1));
