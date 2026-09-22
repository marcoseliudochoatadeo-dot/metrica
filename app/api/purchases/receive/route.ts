import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, receivedItems } = body; 
    // receivedItems es un array de { productId, quantity } de los productos que SÍ llegaron y se palomearon

    if (!orderId || !receivedItems || !Array.isArray(receivedItems)) {
      return NextResponse.json({ error: 'Datos incompletos para recibir la orden.' }, { status: 400 });
    }

    // Buscamos la orden
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden de compra no encontrada.' }, { status: 404 });
    }

    if (order.status === 'RECEIVED') {
      return NextResponse.json({ error: 'Esta orden ya fue recibida anteriormente.' }, { status: 400 });
    }

    // Ejecutamos la transacción para actualizar stock de almacén y marcar la orden como recibida
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar stock en CEDIS solo para los items validados
      for (const item of receivedItems) {
        if (item.quantity > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              warehouseStock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // 2. Marcar la orden como recibida
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'RECEIVED' },
      });
    });

    return NextResponse.json({ success: true, message: '¡Orden recibida y stock cargado al almacén con éxito!' });
  } catch (error: any) {
    console.error('Error al recibir orden de compra:', error);
    return NextResponse.json({ error: error?.message || 'Error en el servidor.' }, { status: 500 });
  }
}