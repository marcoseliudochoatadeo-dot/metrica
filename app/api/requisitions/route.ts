import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body; // Array de { productId, quantity }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No hay productos en la requisición.' },
        { status: 400 }
      );
    }

    for (const item of items) {
      const productId = String(item.productId);
      const qtyRequested = parseInt(String(item.quantity), 10) || 0;

      if (qtyRequested <= 0) continue;

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) continue;

      const currentWarehouse = Number(product.warehouseStock) || 0;
      const currentBar = Number(product.stockClosed) || 0;

      // Validar que haya suficiente en almacén (opcional, pero recomendado)
      // Si quieres permitir rebasar, puedes omitir esta validación
      const newWarehouseStock = Math.max(0, currentWarehouse - qtyRequested);
      const newStockClosed = currentBar + qtyRequested;

      // Actualizamos ambos stocks en una sola operación por producto
      await prisma.product.update({
        where: { id: productId },
        data: {
          warehouseStock: newWarehouseStock,
          stockClosed: newStockClosed,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Requisición surtida con éxito. Stock transferido del Almacén a la Barra.',
    });
  } catch (error: any) {
    console.error('Error al procesar la requisición:', error);
    return NextResponse.json(
      { error: error?.message || 'Error en el servidor al surtir la requisición.' },
      { status: 500 }
    );
  }
}