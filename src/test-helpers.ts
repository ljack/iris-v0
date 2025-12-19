import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, mkdirSync } from 'fs';
import * as path from 'path';

/**
 * Validates WASP (WebAssembly Text) source code using wat2wasm.
 * Throws an error if validation fails.
 * 
 * @param watSource - The WASP source code to validate
 * @param testName - Unique name for temporary files (e.g., test case name)
 * @returns true if validation succeeds
 * @throws Error if wat2wasm validation fails or wat2wasm is not available
 */
export function validateWatWithWat2Wasm(watSource: string, testName: string): boolean {
  const tempDir = path.join(__dirname, '../tests/temp');
  
  // Create temp directory if it doesn't exist
  try {
    mkdirSync(tempDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
  
  const watPath = path.join(tempDir, `${testName.replace(/[^a-zA-Z0-9]/g, '_')}.wat`);
  const wasmPath = path.join(tempDir, `${testName.replace(/[^a-zA-Z0-9]/g, '_')}.wasm`);
  
  try {
    // Write WASP file
    writeFileSync(watPath, watSource, 'utf8');
    
    // Validate with wat2wasm
    try {
      execSync(`wat2wasm ${watPath} -o ${wasmPath}`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
    } catch (error: any) {
      // Clean up on error
      try { unlinkSync(watPath); } catch {}
      try { unlinkSync(wasmPath); } catch {}
      throw new Error(`wat2wasm validation failed: ${error.message}`);
    }
    
    // Verify that WASM file was created and is not empty
    const wasm = readFileSync(wasmPath);
    if (wasm.length === 0) {
      throw new Error('wat2wasm produced empty WASM file');
    }
    
    // Clean up
    unlinkSync(watPath);
    unlinkSync(wasmPath);
    
    return true;
  } catch (error: any) {
    // Clean up on error
    try { unlinkSync(watPath); } catch {}
    try { unlinkSync(wasmPath); } catch {}
    
    // Check if wat2wasm is available
    if (error.message.includes('wat2wasm') && error.message.includes('not found')) {
      throw new Error('wat2wasm not found. Please install wabt: https://github.com/WebAssembly/wabt');
    }
    
    throw error;
  }
}

/**
 * Checks if wat2wasm is available in the system PATH.
 * @returns true if wat2wasm is available, false otherwise
 */
export function isWat2WasmAvailable(): boolean {
  try {
    execSync('wat2wasm --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}


