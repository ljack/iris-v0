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
    '!Pure': ['limits.fuel_remaining', 'limits.request_yield', 'log.debug'],
    '!IO': ['io.print_utf8', 'io.read_line'],
    '!Net': ['net.http_request'],
    '!FS': ['fs.open_dir', 'fs.read_file', 'fs.write_file'],
    '!Clock': ['clock.monotonic_ms', 'clock.wall_ms'],
    '!Rand': ['rand.u64', 'rand.bytes'],
    '!Device': ['device.gpio_write', 'device.gpio_read', 'device.i2c_tx', 'device.i2c_rx']
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
    if (!profile) {
        return { ok: false, profile: profileName, error: 'E_CAPABILITY', missing: requested.slice() };
    }

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
