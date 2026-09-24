import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Obtener todos los usuarios registrados
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roleLabel: true,
        permissions: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Actualizar puesto y permisos de un usuario específico
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, roleLabel, permissions } = body;

    await prisma.user.update({
      where: { id: userId },
      data: {
        roleLabel: roleLabel || 'Empleado',
        permissions: permissions ? JSON.stringify(permissions) : JSON.stringify({}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}