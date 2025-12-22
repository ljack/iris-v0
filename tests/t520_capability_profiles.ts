import { Capability } from '../src/types';
import { TestCase } from '../src/test-types';
import { HostProfile, validateHostRequest } from '../src/runtime/host-validator';

function createCap(name: string): Capability {
    return { name, type: { type: 'Bool' } };
}

function expectFailure(result: ReturnType<typeof validateHostRequest>) {
    if (result.ok) throw new Error('Expected validation failure');
    if (result.error.code !== 'E_CAPABILITY') throw new Error(`Unexpected error code ${result.error.code}`);
    if (result.error.missing.length === 0) throw new Error('Missing capabilities list should be populated');
}

export const t520_capability_profiles: TestCase = {
    name: 't520_capability_profiles',
    fn: async () => {
        const netReq = createCap('Net');

        const allowedBrowser = validateHostRequest('browser_playground', [netReq], ['net']);
        if (!allowedBrowser.ok) {
            throw new Error(`Expected browser_playground to allow Net when configured: ${allowedBrowser.error.message}`);
        }

        const deniedBrowser = validateHostRequest('browser_playground', [netReq]);
        expectFailure(deniedBrowser);

        const pureResult = validateHostRequest('pure', [netReq], ['net']);
        expectFailure(pureResult);

        const strictProfile: HostProfile = 'pure';
        const emptyRequest = validateHostRequest(strictProfile, []);
        if (!emptyRequest.ok) throw new Error('Empty capability list should always succeed');
    },
};
