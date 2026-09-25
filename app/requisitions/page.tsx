import { prisma } from '@/lib/prisma';
import RequisitionsClient from './RequisitionsClient';

export const dynamic = 'force-dynamic';

export default async function RequisitionsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

  // Obtener la lista completa de proveedores desde la tabla Supplier
  const supplierRows = await prisma.supplier.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  });
  const existingSuppliers = supplierRows
    .map((r) => r.name)
    .filter((s) => s && s.trim() !== '');

  const pendingOrders = await prisma.requisitionOrder.findMany({
    where: { status: 'PENDING' },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const completedOrders = await prisma.requisitionOrder.findMany({
    where: { status: 'COMPLETED' },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20, // Historial reciente
  });

  return (
    <RequisitionsClient 
      products={products} 
      existingSuppliers={existingSuppliers} 
      pendingOrders={pendingOrders} 
      completedOrders={completedOrders} 
    />
  );
}