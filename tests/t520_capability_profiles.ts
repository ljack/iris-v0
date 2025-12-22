import { Capability } from '../src/types';
import { TestCase } from '../src/test-types';
import { HostProfile, validateHostRequest } from '../src/runtime/host-validator';

function createCap(name: string): Capability {
    return { name, type: { type: 'Bool' } };
}

function expectFailure(result: ReturnType<typeof validateHostRequest>, expectedMissing: string[]) {
    if (result.ok) throw new Error('Expected validation failure');
    if (result.error.code !== 'E_CAPABILITY') throw new Error(`Unexpected error code ${result.error.code}`);
    const missing = result.error.missing.slice().sort().join(',');
    const expected = expectedMissing.slice().sort().join(',');
    if (missing !== expected) {
        throw new Error(`Missing capabilities mismatch: expected ${expected}, got ${missing}`);
    }
}

export const t520_capability_profiles: TestCase = {
    name: 'Test 520: capability profiles',
    fn: async () => {
        const netReq = createCap('Net');

        const allowedBrowser = validateHostRequest('browser_playground', [netReq], ['net']);
        if (!allowedBrowser.ok) {
            throw new Error(`Expected browser_playground to allow Net when configured: ${allowedBrowser.error.message}`);
        }

        const deniedBrowser = validateHostRequest('browser_playground', [netReq]);
        expectFailure(deniedBrowser, ['net']);

        const pureResult = validateHostRequest('pure', [netReq], ['net']);
        expectFailure(pureResult, ['net']);

        const strictProfile: HostProfile = 'pure';
        const emptyRequest = validateHostRequest(strictProfile, []);
        if (!emptyRequest.ok) throw new Error('Empty capability list should always succeed');

        const caseInsensitive = validateHostRequest('browser_playground', [netReq], ['Net']);
        if (!caseInsensitive.ok) {
            throw new Error(`Expected case-insensitive match for Net: ${caseInsensitive.error.message}`);
        }
    },
};
