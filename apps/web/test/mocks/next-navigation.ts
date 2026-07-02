import { vi } from 'vitest';

export const useRouter = () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
});

export const usePathname = () => '/en/access';

export const useSearchParams = () => new URLSearchParams();

export const redirect = vi.fn();
