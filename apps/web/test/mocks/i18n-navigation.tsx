import type { AnchorHTMLAttributes, ReactElement, ReactNode } from 'react';

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children?: ReactNode;
};

export function Link({ href, children, ...rest }: LinkProps): ReactElement {
    return (
        <a href={href} {...rest}>
            {children}
        </a>
    );
}

export const useRouter = () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
});

export const usePathname = () => '/en';

export const redirect = () => undefined;

export const getPathname = () => '/en';
