import { getPrisma } from '../client';
import {
    deleteStorageObject,
    listStorageObjects,
    storageObjectPathFromPublicUrl,
} from '../storage';

const ORPHAN_AGE_MS = Number(
    process.env.ORPHAN_UPLOAD_AGE_MS ?? String(60 * 60 * 1000),
);

async function collectReferencedPaths(): Promise<Set<string>> {
    const paths = new Set<string>();
    if (!process.env.DATABASE_URL?.trim()) {
        return paths;
    }

    const prisma = getPrisma();
    const attachments = await prisma.caseAttachment.findMany({
        select: { url: true },
    });
    for (const row of attachments) {
        const path = storageObjectPathFromPublicUrl(row.url);
        if (path) paths.add(path);
    }

    return paths;
}

/**
 * Removes storage objects under cases/ not referenced in the database after 1 hour.
 */
export async function cleanupOrphanUploads(): Promise<{ removed: number }> {
    const referenced = await collectReferencedPaths();
    const objects = await listStorageObjects({ prefix: 'cases/' });
    const cutoff = Date.now() - ORPHAN_AGE_MS;
    let removed = 0;

    for (const object of objects) {
        if (!object.name.startsWith('cases/')) continue;
        if (referenced.has(object.name)) continue;
        const createdAt = object.created_at
            ? Date.parse(object.created_at)
            : NaN;
        if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;
        const deleted = await deleteStorageObject(object.name);
        if (deleted) removed += 1;
    }

    return { removed };
}
