import { Capability, CapabilityProfiles, validateCapabilities } from '../src/host/capabilities';
import { TestCase } from '../src/test-types';

export const t215_capability_validator: TestCase = {
    name: 'Test 215: Capability validator respects profiles',
    fn: async () => {
        const allowed = validateCapabilities([Capability.IO, Capability.Clock, Capability.Net], 'browser_playground');
        if (!allowed.ok) {
            throw new Error('browser_playground should allow IO, Clock, Net');
        }

        const rejected = validateCapabilities([Capability.IO, Capability.FS, Capability.Device], 'browser_playground');
        if (rejected.ok) {
            throw new Error('Expected FS and Device to be rejected for browser_playground');
        }
        if (rejected.tag !== 'E_CAPABILITY') {
            throw new Error(`Unexpected error tag: ${(rejected as any).tag}`);
        }
        if (rejected.missing.length !== 2 || !rejected.missing.includes(Capability.FS) || !rejected.missing.includes(Capability.Device)) {
            throw new Error(`Unexpected missing capabilities: ${JSON.stringify(rejected.missing)}`);
        }
        if (rejected.profile !== 'browser_playground') {
            throw new Error(`Unexpected profile: ${rejected.profile}`);
        }

        const noDeclared = validateCapabilities(undefined, 'pure');
        if (!noDeclared.ok) {
            throw new Error('Programs without declared capabilities should pass validation');
        }

        const serverOk = validateCapabilities(CapabilityProfiles.server_agent, 'server_agent');
        if (!serverOk.ok) {
            throw new Error('server_agent profile should allow all of its listed capabilities');
        }
    },
};
