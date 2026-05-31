import { NextResponse } from 'next/server';

const locales = ['en', 'pl'];
const defaultLocale = 'en';

function getLocale(request) {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  const detected = acceptLanguage
    .split(',')
    .map((lang) => lang.split(';')[0].trim().toLowerCase().split('-')[0])
    .find((lang) => locales.includes(lang));

  return detected || defaultLocale;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  const locale = getLocale(request);
  
  const redirectUrl = new URL(`/${locale}${pathname}${request.nextUrl.search}`, request.url);
  
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|window.svg|.*\\..*).*)',
  ],
};