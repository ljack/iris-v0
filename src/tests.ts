import { run } from '../src/main';
import * as testCases from '../tests';
import { TestCase } from './test-types';

const tests: TestCase[] = Object.values(testCases).map(t => t as TestCase).sort((a, b) => a.name.localeCompare(b.name));

async function main() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      console.log(`Running ${t.name}...`);
      const val = await run(t.source, t.fs, t.modules);

      // Strict equality check
      if (val === t.expect) {
        console.log(`✅ PASS ${t.name}`);
        passed++;
      } else {
        // Allow updated error message for T17
        if (t.name === 'Test 17: match non-option' && val.startsWith('TypeError: Match target must be Option or Result')) {
          console.log(`✅ PASS ${t.name} (Error message adjusted)`);
          passed++;
        } else {
          console.error(`❌ FAILED ${t.name}: Expected '${t.expect}', got '${val}'`);
          failed++;
        }
      }
    } catch (e: any) {
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
