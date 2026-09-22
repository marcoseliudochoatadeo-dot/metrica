import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body; // Espera un array de { productId, warehouseMinStock, warehouseMaxStock }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay elementos para actualizar.' }, { status: 400 });
    }

    // Actualizamos todos en paralelo usando una transacción de Prisma
    await prisma.$transaction(
      items.map((item: any) =>
        prisma.product.update({
          where: { id: item.productId },
          data: {
            warehouseMinStock: parseFloat(item.warehouseMinStock) || 0,
            warehouseMaxStock: parseFloat(item.warehouseMaxStock) || 0,
          },
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Límites actualizados correctamente.' });
  } catch (error: any) {
    console.error('Error al actualizar límites por lote:', error);
    return NextResponse.json({ error: error?.message || 'Error en el servidor.' }, { status: 500 });
  }
}