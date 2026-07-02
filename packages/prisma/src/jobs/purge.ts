import { getCaseStore } from '../get-case-store';

/**
 * Purges terminal cases past the retention window. Skips cases with legalHold=true.
 */
export async function runRetentionPurge(): Promise<{ purged: number }> {
    const retentionDays = Number(process.env.RETENTION_DAYS ?? '90');
    if (!Number.isFinite(retentionDays) || retentionDays < 0) {
        return { purged: 0 };
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const purged = await getCaseStore().purgeRetention(cutoff);
    return { purged };
}
