import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const SESSION_COOKIE = 'sv_case_session';
const PARTNER_SESSION_COOKIE = 'sv_partner_session';
const intlMiddleware = createMiddleware(routing);

const LOCALELESS_PATHS = new Set([
    '/access',
    '/auth',
    '/chat',
    '/demo',
    '/dashboard',
    '/documentation',
]);

function withDefaultLocale(pathname: string, locale: string): string {
    if (pathname === '/') return `/${locale}`;
    return `/${locale}${pathname}`;
}

export default function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    if (LOCALELESS_PATHS.has(pathname) || pathname === '/') {
        const locale =
            request.cookies.get('NEXT_LOCALE')?.value ??
            routing.defaultLocale;
        const safeLocale = routing.locales.includes(locale as 'en' | 'ar')
            ? locale
            : routing.defaultLocale;
        const url = request.nextUrl.clone();
        url.pathname = withDefaultLocale(pathname, safeLocale);
        return NextResponse.redirect(url);
    }

    const intlResponse = intlMiddleware(request);

    const localeMatch = pathname.match(/^\/(en|ar)(\/.*)?$/);
    const locale = localeMatch?.[1] ?? routing.defaultLocale;
    const pathWithoutLocale = localeMatch?.[2] ?? pathname;

    if (
        pathWithoutLocale === '/auth' &&
        process.env.SAFEVOICES_ACCESS_V2 !== 'false'
    ) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/access`;
        return NextResponse.redirect(url);
    }

    if (pathWithoutLocale === '/chat') {
        const caseId = searchParams.get('caseId')?.trim();
        if (!caseId) {
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/access`;
            url.search = '';
            return NextResponse.redirect(url);
        }
        const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
        if (
            !hasSession &&
            process.env.SAFEVOICES_ENFORCE_CHAT_SESSION === 'true'
        ) {
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/access`;
            url.searchParams.set(
                'return',
                `/${locale}/chat?caseId=${caseId}`,
            );
            return NextResponse.redirect(url);
        }
    }

    if (pathWithoutLocale === '/dashboard' || pathWithoutLocale.startsWith('/dashboard/')) {
        const hasPartnerSession = Boolean(
            request.cookies.get(PARTNER_SESSION_COOKIE)?.value,
        );
        if (!hasPartnerSession) {
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/auth/email`;
            url.searchParams.set('return', pathname + request.nextUrl.search);
            return NextResponse.redirect(url);
        }
    }

    return intlResponse;
}

export const config = {
    matcher: ['/', '/(en|ar)/:path*', '/access', '/auth', '/chat', '/demo', '/dashboard', '/documentation'],
};
