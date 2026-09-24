import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.url ? new URL(request.url) : { pathname: request.nextUrl.pathname };

  // Rutas públicas que no requieren autenticación
  const isLoginPage = pathname.startsWith('/login');

  // Si no hay token y no está en el login, redirigir al login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si ya hay token y trata de ir al login, redirigirlo al inicio (/)
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Configura las rutas que quieres proteger
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto archivos estáticos, imágenes, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};