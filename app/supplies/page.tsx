import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SuppliesClientContainer from './SuppliesClientContainer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuppliesPage() {
  // 1. Obtener productos
  const rawProducts = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });
  const products = JSON.parse(JSON.stringify(rawProducts));

  // 2. Obtener proveedores oficiales de la tabla Supplier
  const rawSuppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
  });
  const suppliers = JSON.parse(JSON.stringify(rawSuppliers));

  // 3. Extraer lista única de nombres de proveedores (para el autocompletado del formulario de insumos)
  const productSuppliersRaw = await prisma.product.findMany({
  select: { supplier: true },
  where: { 
    supplier: { not: "" } // En lugar de null, pedimos que no esté vacío
  },
});
  
  const existingSuppliers = Array.from(
    new Set([
      ...rawSuppliers.map((s) => s.name),
      ...productSuppliersRaw.map((p) => p.supplier),
    ].filter(Boolean))
  ) as string[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Insumos y Proveedores</h1>
          <p className="text-sm text-slate-400">
            Catálogo de productos, control de tara, capacidad y directorio de distribuidores.
          </p>
        </div>
        <Link
          href="/inventory"
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
        >
          Ir a Inventario →
        </Link>
      </div>

      {/* Contenedor con pestañas para alternar entre Catálogo y Proveedores */}
      <SuppliesClientContainer 
        products={products} 
        suppliers={suppliers} 
        existingSuppliers={existingSuppliers} 
      />
    </div>
  );
}