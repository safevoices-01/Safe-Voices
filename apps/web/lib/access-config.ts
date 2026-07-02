export function isAccessV2Enabled(): boolean {
    return process.env.SAFEVOICES_ACCESS_V2 !== 'false';
}

export function getAccessPath(): string {
    return isAccessV2Enabled() ? '/access' : '/auth';
}
