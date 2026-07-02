import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/en/access',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
}));

vi.mock('next-intl', async (importOriginal) => {
    const actual = await importOriginal<typeof import('next-intl')>();
    const t = (key: string) => key;
    (t as unknown as { rich: (key: string) => string }).rich = (key: string) => key;
    return {
        ...actual,
        useTranslations: () => t,
        useLocale: () => 'en',
    };
});


class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;

if (typeof document !== 'undefined' && !document.elementFromPoint) {
    document.elementFromPoint = (): null => null;
}
