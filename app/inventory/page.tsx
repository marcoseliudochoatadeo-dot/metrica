import { prisma } from '@/lib/prisma';
import InventoryClient from './InventoryClient';

// Desactiva la caché estática de Next.js por completo
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

  return <InventoryClient products={products} />;
}