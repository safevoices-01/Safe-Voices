const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export function isValidEmailFormat(value: string): boolean {
    const t = value.trim();
    if (t.length === 0 || t.length > 254) return false;
    return EMAIL_RE.test(t);
}
