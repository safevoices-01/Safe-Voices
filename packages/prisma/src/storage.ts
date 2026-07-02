export type SignedUploadResult = {
    signedUrl: string;
    publicUrl: string;
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function isAllowedUploadMime(mimeType: string): boolean {
    return (ALLOWED_TYPES as readonly string[]).includes(mimeType);
}

function getStorageConfig(): {
    baseUrl: string;
    serviceKey: string;
    bucket: string;
} | null {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() ?? 'case-uploads';
    if (!baseUrl || !serviceKey) return null;
    return { baseUrl, serviceKey, bucket };
}

export function storageObjectPathFromPublicUrl(publicUrl: string): string | null {
    const config = getStorageConfig();
    if (config) {
        const prefix = `${config.baseUrl}/storage/v1/object/public/${config.bucket}/`;
        if (publicUrl.startsWith(prefix)) {
            return publicUrl.slice(prefix.length);
        }
    }
    try {
        const pathname = new URL(publicUrl).pathname;
        const marker = '/cases/';
        const idx = pathname.indexOf(marker);
        if (idx === -1) return null;
        return pathname.slice(idx + 1);
    } catch {
        return null;
    }
}

export function isCaseUploadPublicUrl(
    publicUrl: string,
    caseId: string,
): boolean {
    const path = storageObjectPathFromPublicUrl(publicUrl);
    if (!path) return false;
    return path.startsWith(`cases/${caseId}/`);
}

export async function createSignedDownloadUrl(
    path: string,
): Promise<string | null> {
    const config = getStorageConfig();
    if (!config) return null;

    const res = await fetch(
        `${config.baseUrl}/storage/v1/object/sign/${config.bucket}/${path}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.serviceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: 3600 }),
        },
    );

    if (!res.ok) return null;
    const json = (await res.json()) as {
        signedURL?: string;
        signedUrl?: string;
    };
    const signed = json.signedURL ?? json.signedUrl;
    if (!signed) return null;
    if (signed.startsWith('http://') || signed.startsWith('https://')) {
        return signed;
    }
    return `${config.baseUrl}${signed.startsWith('/') ? '' : '/'}${signed}`;
}

export async function createSignedUploadUrl(input: {
    caseId: string;
    filename: string;
    mimeType: string;
}): Promise<SignedUploadResult | null> {
    const config = getStorageConfig();
    if (!config) return null;

    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const path = `cases/${input.caseId}/${Date.now()}-${safeName}`;

    const res = await fetch(
        `${config.baseUrl}/storage/v1/object/upload/sign/${config.bucket}/${path}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.serviceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: 60 }),
        },
    );

    if (!res.ok) return null;
    const json = (await res.json()) as {
        signedURL?: string;
        signedUrl?: string;
    };
    const signedUrl = json.signedURL ?? json.signedUrl;
    if (!signedUrl) return null;

    const publicUrl = `${config.baseUrl}/storage/v1/object/public/${config.bucket}/${path}`;
    return { signedUrl, publicUrl };
}

export async function listStorageObjects(input: {
    prefix: string;
    limit?: number;
}): Promise<Array<{ name: string; created_at?: string }>> {
    const config = getStorageConfig();
    if (!config) return [];

    const res = await fetch(
        `${config.baseUrl}/storage/v1/object/list/${config.bucket}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.serviceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prefix: input.prefix,
                limit: input.limit ?? 1000,
                sortBy: { column: 'created_at', order: 'asc' },
            }),
        },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as Array<{
        name: string;
        created_at?: string;
    }>;
    return Array.isArray(json) ? json : [];
}

export async function deleteStorageObject(path: string): Promise<boolean> {
    const config = getStorageConfig();
    if (!config) return false;

    const res = await fetch(
        `${config.baseUrl}/storage/v1/object/${config.bucket}/${path}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${config.serviceKey}`,
            },
        },
    );
    return res.ok;
}
