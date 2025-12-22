import { Capability } from '../types';

export type HostProfile = 'pure' | 'browser_playground';

export type HostValidationError = {
    code: 'E_CAPABILITY';
    message: string;
    missing: string[];
};

export type HostValidationResult =
    | { ok: true }
    | { ok: false; error: HostValidationError };

const PROFILE_CAPS: Record<HostProfile, string[]> = {
    pure: [],
    browser_playground: [],
};

function normalize(cap: string): string {
    return cap.trim().toLowerCase();
}

export function validateHostRequest(
    profile: HostProfile,
    requiredCaps: Capability[],
    allowedCaps: string[] = [],
): HostValidationResult {
    if (profile === 'pure') {
        if (requiredCaps.length === 0) return { ok: true };

        const missingPureCaps = requiredCaps.map((cap) => normalize(cap.name));
        return {
            ok: false,
            error: {
                code: 'E_CAPABILITY',
                message: `Missing capabilities: ${missingPureCaps.join(', ')}`,
                missing: missingPureCaps,
            },
        };
    }

    const baseAllowed = PROFILE_CAPS[profile] || [];
    const allowed = new Set([...baseAllowed, ...allowedCaps.map(normalize)]);

    const missing = requiredCaps
        .map((cap) => normalize(cap.name))
        .filter((name) => !allowed.has(name));

    if (missing.length > 0) {
        return {
            ok: false,
            error: {
                code: 'E_CAPABILITY',
                message: `Missing capabilities: ${missing.join(', ')}`,
                missing,
            },
        };
    }

    return { ok: true };
}
