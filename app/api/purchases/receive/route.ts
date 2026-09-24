import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache'; // <-- AGREGAMOS ESTA IMPORTACIÓN

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, receivedItems } = body; 

    if (!orderId || !receivedItems || !Array.isArray(receivedItems)) {
      return NextResponse.json({ error: 'Datos incompletos para recibir la orden.' }, { status: 400 });
    }

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

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar stock en CEDIS
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

    // <-- AGREGAMOS ESTAS DOS LÍNEAS PARA LIMPIAR EL CACHÉ Y REFRESCAR LA PANTALLA
    revalidatePath('/purchases');
    revalidatePath('/warehouse');

    return NextResponse.json({ success: true, message: '¡Orden recibida y stock cargado al almacén con éxito!' });
  } catch (error: any) {
    console.error('Error al recibir orden de compra:', error);
    return NextResponse.json({ error: error?.message || 'Error en el servidor.' }, { status: 500 });
  }
}