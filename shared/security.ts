/** Versioned company defense configuration. V1 is a fixed starter patrol, not PvP matchmaking. */
export type CompanySecurity = {
    version: 1;
    drone: {
        enabled: boolean;
        route: 'hq-perimeter';
    };
};
export const DEFAULT_SECURITY: CompanySecurity = { version: 1, drone: { enabled: true, route: 'hq-perimeter' } };
export const companySecurity = (s: {
    security?: CompanySecurity;
}) => s.security ?? DEFAULT_SECURITY;
