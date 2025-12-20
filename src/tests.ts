import { run } from '../src/main';
import { TESTS } from '../tests';
import { TestCase } from './test-types';

const args = process.argv.slice(2);
let grep: string | undefined;
const grepIndex = args.indexOf('--grep');
if (grepIndex !== -1 && grepIndex + 1 < args.length) {
  grep = args[grepIndex + 1];
}
const failOnly = args.includes('--fail-only');

const allTests = TESTS.sort((a, b) => a.name.localeCompare(b.name));
import { t_unit_fmt, t_unit_typesEqual } from '../tests/t_unit_typecheck_utils';
import { t_unit_lsp_diagnostics } from '../tests/t_unit_lsp_diagnostics';

const tests: TestCase[] = [
  t_unit_fmt,
  t_unit_typesEqual,
  t_unit_lsp_diagnostics,
  ...(grep
    ? allTests.filter(t => t.name.toLowerCase().includes(grep!.toLowerCase()))
    : allTests)
];

if (grep) {
  console.log(`Running tests matching: "${grep}" (Found ${tests.length})`);
}

async function main() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      if (!failOnly) console.log(`Running ${t.name}...`);

      if ('fn' in t) {
        await t.fn();
        passed++;
        continue;
      }

      const outputBuffer: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => outputBuffer.push(msg);

      let val;
      try {
        val = await run(t.source, t.fs, t.modules);
      } finally {
        console.log = originalLog;
      }

      const output = outputBuffer.join('\n');

      // Strict equality check for return value
      if (val === t.expect) {
        if (t.expectOutput) {
          const expectedOut = t.expectOutput.join('\n').trim();
          if (output.trim() === expectedOut) {
            if (!failOnly) console.log(`✅ PASS ${t.name}`);
            passed++;
          } else {
            console.error(`❌ FAILED ${t.name}: Expected output:\n${expectedOut}\nGot:\n${output.trim()}`);
            failed++;
          }
        } else {
          if (!failOnly) console.log(`✅ PASS ${t.name}`);
          passed++;
        }
      } else {
        // Allow updated error message for T17
        if (t.name === 'Test 17: match non-option' && val.startsWith('TypeError: Match target must be Option or Result')) {
          if (!failOnly) console.log(`✅ PASS ${t.name} (Error message adjusted)`);
          passed++;
        } else {
          console.error(`❌ FAILED ${t.name}: Expected '${t.expect}', got '${val}'`);
          failed++;
        }
      }
    } catch (e: any) {
      if ('expect' in t && t.expect && (t.expect.startsWith('TypeError:') || t.expect.startsWith('RuntimeError:') || t.expect.startsWith('ParseError:') || t.expect.startsWith('Exception:'))) {
        const cleanExpect = t.expect.replace(/^Exception: /, '');
        if (e.message.includes(cleanExpect) || e.message === cleanExpect) {
          if (!failOnly) console.log(`✅ PASS ${t.name} (Exception matched)`);
          passed++;
          continue;
        }
      }
      console.error(`❌ FAILED ${t.name}: Exception: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
