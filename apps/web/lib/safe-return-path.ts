/** Allow only same-origin relative paths (no open redirects). */
export function isSafeReturnPath(path: string): boolean {
    if (!path.startsWith('/') || path.startsWith('//')) {
        return false;
    }
    try {
        const url = new URL(path, 'http://localhost');
        return url.origin === 'http://localhost' && url.pathname.startsWith('/');
    } catch {
        return false;
    }
}
