import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function requirePermission(moduleKey: 'inventory' | 'supplies' | 'recipes' | 'sales' | 'settings') {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      redirect('/');
    }

    let userId = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        userId = payload.id || payload.userId;
      }
    } catch (e) {
      userId = token;
    }

    let user = null;
    if (userId) {
      user = await prisma.user.findFirst({ where: { id: userId } });
    }
    
    if (!user) {
      user = await prisma.user.findFirst({ where: { email: token } });
    }

    if (!user) {
      redirect('/');
    }

    const userAny = user as any;

    // Si es administrador general, permitir el paso inmediatamente
    if (userAny.role === 'ADMIN' || userAny.isAdmin) {
      return user;
    }

    // Si el usuario es STAFF, evaluamos estrictamente su JSON de permisos
    let permissions: any = {};
    if (userAny.permissions) {
      try {
        permissions = JSON.parse(userAny.permissions);
      } catch (e) {}
    }

    // Verificamos si tiene el permiso específico activado (por defecto false si no existe)
    const hasAccess = !!permissions[moduleKey];

    if (!hasAccess) {
      redirect('/');
    }

    return user;
  } catch (error) {
    if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Error en requirePermission:', error);
    redirect('/');
  }
}