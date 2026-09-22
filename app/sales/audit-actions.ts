'use server';

import { prisma } from '@/lib/prisma';

export async function getInventoryAudit() {
  // 1. Obtener todas las recetas vendidas
  const sales = await prisma.sale.findMany({
    include: {
      recipe: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  // 2. Calcular consumo TEÓRICO (lo que debió usarse según el ticket)
  const theoreticalUsage: Record<string, { name: string; mlTeoricos: number }> = {};

  sales.forEach((sale) => {
    sale.recipe.items.forEach((item) => {
      const pId = item.productId;
      if (!theoreticalUsage[pId]) {
        theoreticalUsage[pId] = {
          name: item.product.name,
          mlTeoricos: 0,
        };
      }
      theoreticalUsage[pId].mlTeoricos += item.quantity * sale.quantity;
    });
  });

  // 3. Obtener consumo REAL registradas por pesajes (logs)
  const logs = await prisma.inventoryLog.findMany();
  const realUsage: Record<string, number> = {};

  logs.forEach((log) => {
    if (log.weightDiff < 0) {
      const pId = log.productId;
      realUsage[pId] = (realUsage[pId] || 0) + Math.abs(log.weightDiff);
    }
  });

  // 4. Cruzar información para calcular Faltantes / Sobrantes
  const products = await prisma.product.findMany();

  const auditReport = products.map((prod) => {
    const teorico = theoreticalUsage[prod.id]?.mlTeoricos || 0;
    const real = realUsage[prod.id] || 0;
    const diferencia = real - teorico; // (+) Faltante/Merma, (-) Sobrante

    return {
      productId: prod.id,
      productName: prod.name,
      mlTeoricos: teorico,
      mlReales: real,
      diferenciaML: diferencia,
      status: diferencia > 50 ? 'FALTANTE' : diferencia < -50 ? 'SOBRANTE' : 'CUADRADO',
    };
  });

  return auditReport;
}