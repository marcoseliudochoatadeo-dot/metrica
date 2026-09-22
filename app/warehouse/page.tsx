import React from 'react';
import { prisma } from '@/lib/prisma';
import WarehouseClient from './WarehouseClient';

export const dynamic = 'force-dynamic';

export default async function WarehousePage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

  const auditLogs = await prisma.warehouseAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // Mostramos los últimos 100 ajustes
  });

  const existingSuppliers = Array.from(
    new Set(products.map((p) => p.supplier).filter(Boolean))
  ) as string[];

  return (
    <WarehouseClient
      products={products}
      auditLogs={auditLogs}
      existingSuppliers={existingSuppliers}
    />
  );
}