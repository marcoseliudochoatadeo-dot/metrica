import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Obtener la configuración general (appName y backgroundImage)
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst();
    return NextResponse.json(setting || {});
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({}, { status: 200 });
  }
}

// POST: Guardar o actualizar la configuración general
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appName, backgroundImage } = body;

    const existing = await prisma.systemSetting.findFirst();

    if (existing) {
      await prisma.systemSetting.update({
        where: { id: existing.id },
        data: {
          appName: appName || '',
          backgroundImage: backgroundImage || '',
        },
      });
    } else {
      await prisma.systemSetting.create({
        data: {
          appName: appName || '',
          backgroundImage: backgroundImage || '',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}