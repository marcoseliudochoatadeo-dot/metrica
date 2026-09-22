import { prisma } from '@/lib/prisma';
import PurchasesClient from './purchasesClient';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

  const pendingOrders = await prisma.purchaseOrder.findMany({
    where: { status: 'PENDING' },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  const existingSuppliers = Array.from(
    new Set(products.map((p) => p.supplier).filter(Boolean))
  ) as string[];

  return (
    <PurchasesClient
      products={products}
      existingSuppliers={existingSuppliers}
      pendingOrders={pendingOrders}
    />
  );
}