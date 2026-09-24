import { getProducts } from '@/app/actions';
import { prisma } from '@/lib/prisma';
import PurchasesClient from './purchasesClient';
import { getPurchaseHistory } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
  // 1. Obtener productos para el autocompletado
  const resProducts = await getProducts();
  const products = resProducts.success ? resProducts.data : [];

  // 2. Obtener lista de proveedores únicos
  const supplierRows = await prisma.purchaseOrder.findMany({
    select: { supplier: true },
    distinct: ['supplier'],
  });
  const existingSuppliers = supplierRows
    .map((r) => r.supplier)
    .filter((s) => s.trim() !== '');

  // 3. Obtener órdenes PENDIENTES
  const pendingOrders = await prisma.purchaseOrder.findMany({
    where: { status: 'PENDING' },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  // 4. Obtener HISTORIAL DE COMPRAS (órdenes recibidas)
  const resHistory = await getPurchaseHistory();
  const historyOrders = resHistory.success ? resHistory.data : [];

  return (
    <PurchasesClient
      products={products}
      existingSuppliers={existingSuppliers}
      pendingOrders={pendingOrders}
      historyOrders={historyOrders} 
    />
  );
}