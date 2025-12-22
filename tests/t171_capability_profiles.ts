import {
    Capability,
    CapabilityProfileName,
    capabilityProfiles,
    validateCapabilities
} from '../src/runtime/capabilities';
import { TestCase } from '../src/test-types';

function assertOk(requested: Capability[], profile: CapabilityProfileName) {
    const result = validateCapabilities(requested, profile);
    if (!result.ok) {
        throw new Error(`Expected ok for ${profile}, missing: ${result.missing.join(', ')}`);
    }
}

function assertMissing(requested: Capability[], profile: CapabilityProfileName, missing: Capability[]) {
    const result = validateCapabilities(requested, profile);
    if (result.ok) {
        throw new Error(`Expected failure for ${profile}, got ok`);
    }
    const missingSet = new Set(result.missing);
    for (const cap of missing) {
        if (!missingSet.has(cap)) {
            throw new Error(`Expected missing capability ${cap} under ${profile}`);
        }
    }
    const expectedSet = new Set(missing);
    for (const cap of missingSet) {
        if (!expectedSet.has(cap)) {
            throw new Error(`Unexpected missing capability ${cap} under ${profile}`);
        }
    }
}

export const t171_capability_profiles: TestCase = {
    name: 't171_capability_profiles',
    fn: async () => {
        assertOk(['!Net'], 'browser_playground');
        assertOk(capabilityProfiles.server_agent.capabilities, 'server_agent');

        assertMissing(['!Net'], 'pure', ['!Net']);
        assertMissing(['!FS', '!Device'], 'browser_playground', ['!FS', '!Device']);
    }
};
