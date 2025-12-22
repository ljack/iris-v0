export enum HostCapability {
    Pure = 'Pure',
    IO = 'IO',
    Net = 'Net',
    FS = 'FS',
    Clock = 'Clock',
    Rand = 'Rand',
    Device = 'Device',
}

export type CapabilityProfileName = 'pure' | 'browser_playground' | 'server_agent' | 'iot_min';

export const CapabilityProfiles: Record<CapabilityProfileName, HostCapability[]> = {
    pure: [HostCapability.Pure],
    browser_playground: [
        HostCapability.Pure,
        HostCapability.IO,
        HostCapability.Net,
        HostCapability.Clock,
        HostCapability.Rand,
    ],
    server_agent: [
        HostCapability.Pure,
        HostCapability.IO,
        HostCapability.Net,
        HostCapability.FS,
        HostCapability.Clock,
        HostCapability.Rand,
    ],
    iot_min: [HostCapability.Pure, HostCapability.IO, HostCapability.Clock, HostCapability.Device],
};

export type CapabilityValidationResult =
    | { ok: true }
    | {
        ok: false;
        tag: 'E_CAPABILITY';
        profile: CapabilityProfileName;
        missing: HostCapability[];
        required: HostCapability[];
    };

function isHostCapability(value: unknown): value is HostCapability {
    return Object.values(HostCapability).includes(value as HostCapability);
}

function normalizeCapabilities(
    required: Iterable<HostCapability | string> | null | undefined,
): HostCapability[] {
    if (!required) return [];
    const unique = new Set<HostCapability>();
    for (const cap of required) {
        const normalized =
            typeof cap === 'string'
                ? HostCapability[cap as keyof typeof HostCapability] ?? cap
                : cap;
        if (isHostCapability(normalized)) unique.add(normalized);
    }
    return Array.from(unique);
}

export function validateCapabilities(
    required: Iterable<HostCapability | string> | null | undefined,
    profile: CapabilityProfileName,
): CapabilityValidationResult {
    const requiredList = normalizeCapabilities(required);
    if (requiredList.length === 0) return { ok: true };

    const allowed = new Set(CapabilityProfiles[profile]);
    const missing: HostCapability[] = [];

    for (const cap of requiredList) {
        if (!allowed.has(cap)) missing.push(cap);
    }

    if (missing.length === 0) return { ok: true };

    return {
        ok: false,
        tag: 'E_CAPABILITY',
        profile,
        missing,
        required: requiredList,
    };
}
