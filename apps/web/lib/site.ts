/** Public site origin without trailing slash (from NEXT_PUBLIC_SITE_URL). */
export function getSiteUrl(): string {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const base = raw && raw.length > 0 ? raw : 'http://localhost:3000';
    return base.replace(/\/$/, '');
}
