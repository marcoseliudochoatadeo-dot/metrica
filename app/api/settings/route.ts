import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let setting = await prisma.systemSetting.findUnique({
      where: { id: 'config' },
    });

    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: {
          id: 'config',
          appName: 'Altezza Cocina Italiana',
          backgroundImage: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2000&auto=format&fit=crop',
        },
      });
    }

    return NextResponse.json(setting);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appName, backgroundImage } = body;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'config' },
      update: {
        appName: appName || 'Altezza Cocina Italiana',
        backgroundImage: backgroundImage || '',
      },
      create: {
        id: 'config',
        appName: appName || 'Altezza Cocina Italiana',
        backgroundImage: backgroundImage || '',
      },
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}