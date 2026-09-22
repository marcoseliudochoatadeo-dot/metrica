import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, newWarehouseStock } = body;

    if (!productId || newWarehouseStock === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos.' },
        { status: 400 }
      );
    }

    const physicalStock = parseInt(String(newWarehouseStock), 10);
    if (isNaN(physicalStock) || physicalStock < 0) {
      return NextResponse.json(
        { error: 'El stock físico debe ser un número válido.' },
        { status: 400 }
      );
    }

    // 1. Buscamos el producto actual
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    const previousStock = Number(product.warehouseStock) || 0;
    const difference = physicalStock - previousStock; // Ej: 0 - 1 = -1 (Faltante)
    const unitCost = Number(product.costPrice) || 0;
    const totalLoss = difference < 0 ? Math.abs(difference) * unitCost : 0;

    // 2. Actualizamos el stock en almacén
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { warehouseStock: physicalStock },
    });

    // 3. Si hubo una diferencia, registramos la auditoría/evidencia de merma
    if (difference !== 0) {
      await prisma.warehouseAuditLog.create({
        data: {
          productId: product.id,
          productName: product.name,
          previousStock,
          physicalStock,
          difference,
          unitCost,
          totalLoss,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conteo físico registrado y ajustado correctamente.',
      difference,
      totalLoss,
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Error al registrar ajuste de almacén:', error);
    return NextResponse.json(
      { error: error?.message || 'Error en el servidor.' },
      { status: 500 }
    );
  }
}