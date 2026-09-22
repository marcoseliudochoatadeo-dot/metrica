import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplier, invoiceFolio, invoiceNumber, items } = body;
    const folio = invoiceFolio || invoiceNumber || 'S/F';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'La orden de compra no contiene productos.' },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const cost = Number(item.unitCost) || 0;
      const sub = qty * cost;
      totalAmount += sub;

      return {
        productId: String(item.productId),
        productName: String(item.productName),
        quantity: qty,
        unitCost: cost,
        subtotal: sub,
      };
    });

    // Creamos la orden en estado PENDING (Standby, sin tocar stock todavía)
    const newOrder = await prisma.purchaseOrder.create({
      data: {
        supplier: supplier || 'General',
        invoiceFolio: folio,
        status: 'PENDING',
        totalAmount,
        items: {
          create: formattedItems,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '¡Orden de compra guardada en Standby! Se cargará al Almacén al confirmar la recepción de la factura.',
      orderId: newOrder.id,
    });
  } catch (error: any) {
    console.error('Error crítico al procesar la orden de compra:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al guardar la orden en el servidor.' },
      { status: 500 }
    );
  }
}