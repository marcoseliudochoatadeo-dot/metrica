import { prisma } from '@/lib/prisma';
import RequisitionsClient from './RequisitionsClient';

export const dynamic = 'force-dynamic';

export default async function RequisitionsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

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
      pendingOrders={pendingOrders} 
      completedOrders={completedOrders} 
    />
  );
}