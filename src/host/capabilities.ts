export enum Capability {
    Pure = 'Pure',
    IO = 'IO',
    Net = 'Net',
    FS = 'FS',
    Clock = 'Clock',
    Rand = 'Rand',
    Device = 'Device',
}

export type CapabilityProfileName = 'pure' | 'browser_playground' | 'server_agent' | 'iot_min';

export const CapabilityProfiles: Record<CapabilityProfileName, Capability[]> = {
    pure: [Capability.Pure],
    browser_playground: [Capability.Pure, Capability.IO, Capability.Net, Capability.Clock, Capability.Rand],
    server_agent: [Capability.Pure, Capability.IO, Capability.Net, Capability.FS, Capability.Clock, Capability.Rand],
    iot_min: [Capability.Pure, Capability.IO, Capability.Clock, Capability.Device],
};

export type CapabilityValidationResult =
    | { ok: true }
    | {
        ok: false;
        tag: 'E_CAPABILITY';
        profile: CapabilityProfileName;
        missing: Capability[];
        required: Capability[];
    };

function normalizeCapabilities(required: Iterable<Capability | string> | null | undefined): Capability[] {
    if (!required) return [];
    const unique = new Set<Capability>();
    for (const cap of required) {
        const normalized = typeof cap === 'string' ? (Capability as any)[cap as keyof typeof Capability] || cap : cap;
        if (Object.values(Capability).includes(normalized as Capability)) unique.add(normalized as Capability);
    }
    return Array.from(unique.values());
}

export function validateCapabilities(
    required: Iterable<Capability | string> | null | undefined,
    profile: CapabilityProfileName,
): CapabilityValidationResult {
    const requiredList = normalizeCapabilities(required);
    if (requiredList.length === 0) return { ok: true };

    const allowed = new Set(CapabilityProfiles[profile]);
    const missing: Capability[] = [];

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
