export type Capability =
    | '!Pure'
    | '!IO'
    | '!Net'
    | '!FS'
    | '!Clock'
    | '!Rand'
    | '!Device';

export type CapabilityProfileName =
    | 'pure'
    | 'browser_playground'
    | 'server_agent'
    | 'iot_min';

export interface CapabilityProfile {
    name: CapabilityProfileName;
    capabilities: Capability[];
}

export const HOST_ABI_VERSION = 'iris-host-abi/0.1.0';

export const capabilityImportMap: Record<Capability, string[]> = {
    '!Pure': [],
    '!IO': [
        'host.print',
        'host.parse_i64',
        'host.i64_to_string',
        'host.str_concat',
        'host.str_concat_temp',
        'host.str_eq',
        'host.temp_reset',
        'host.args_list',
        'host.record_get',
        'host.tool_call_json'
    ],
    '!Net': [],
    '!FS': [],
    '!Clock': [],
    '!Rand': ['host.rand_u64'],
    '!Device': []
};

export const capabilityProfiles: Record<CapabilityProfileName, CapabilityProfile> = {
    pure: {
        name: 'pure',
        capabilities: ['!Pure']
    },
    browser_playground: {
        name: 'browser_playground',
        capabilities: ['!Pure', '!IO', '!Net', '!Clock', '!Rand']
    },
    server_agent: {
        name: 'server_agent',
        capabilities: ['!Pure', '!IO', '!Net', '!FS', '!Clock', '!Rand']
    },
    iot_min: {
        name: 'iot_min',
        capabilities: ['!Pure', '!IO', '!Device', '!Clock']
    }
};

export interface CapabilityValidationOk {
    ok: true;
    profile: CapabilityProfileName;
    granted: Capability[];
}

export interface CapabilityValidationError {
    ok: false;
    profile: CapabilityProfileName;
    error: 'E_CAPABILITY';
    missing: Capability[];
}

export type CapabilityValidationResult = CapabilityValidationOk | CapabilityValidationError;

export function validateCapabilities(
    requested: Capability[],
    profileName: CapabilityProfileName
): CapabilityValidationResult {
    const profile = capabilityProfiles[profileName];

    const granted = new Set(profile.capabilities);
    const missing: Capability[] = [];

    for (const cap of requested) {
        if (!granted.has(cap)) {
            missing.push(cap);
        }
    }

    if (missing.length > 0) {
        return { ok: false, profile: profileName, error: 'E_CAPABILITY', missing };
    }

    return { ok: true, profile: profileName, granted: profile.capabilities.slice() };
}
