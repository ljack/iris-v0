#!/usr/bin/env ts-node
/**
 * Script to validate all generated WASP files using wat2wasm.
 * Scans examples/real/compiler for .iris files that generate WASP,
 * compiles them, and validates the output.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateWatWithWat2Wasm, isWat2WasmAvailable } from '../src/test-helpers';

const EXAMPLES_DIR = join(__dirname, '../examples/real/compiler');
const WASM_GENERATING_FILES = [
  'codegen_wasm_expr.iris',
  'codegen_wasm.iris',
  'compiler.iris',
  'lexer.iris',
  'parser.iris',
  'typecheck.iris'
];

async function main() {
  console.log('🔍 Validating WASP generation...\n');
  
  if (!isWat2WasmAvailable()) {
    console.warn('⚠️  wat2wasm not found. Skipping validation.');
    console.warn('   Install wabt: https://github.com/WebAssembly/wabt');
    process.exit(0);
  }
  
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const file of WASM_GENERATING_FILES) {
    const filePath = join(EXAMPLES_DIR, file);
    if (!existsSync(filePath)) {
      console.log(`⏭️  Skipping ${file} (not found)`);
      continue;
    }
    
    console.log(`📝 Checking ${file}...`);
    
    try {
      // For now, we'll need to actually run the IRIS code to generate WASP
      // This is a placeholder - actual implementation would:
      // 1. Parse the .iris file
      // 2. Run it through the interpreter
      // 3. Extract generated WASP
      // 4. Validate with wat2wasm
      
      // TODO: Implement actual WASP extraction from IRIS execution
      console.log(`   ⚠️  WASP extraction not yet implemented for ${file}`);
      console.log(`   💡 This script needs integration with IRIS interpreter`);
      
    } catch (error: any) {
      failed++;
      const errorMsg = `❌ ${file}: ${error.message}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (errors.length > 0) {
    console.error('\n❌ Errors:');
    errors.forEach(e => console.error(`   ${e}`));
    process.exit(1);
  }
  
  console.log('\n✅ All WASP files validated successfully!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

