'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SupplyForm from './SupplyForm';
import { deleteProduct } from '@/app/actions';

export default function SupplyList({ 
  products = [], 
  existingSuppliers = [] 
}: { 
  products: any[]; 
  existingSuppliers: string[]; 
}) {
  const router = useRouter();
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Extraer categorías únicas
  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    products.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
    });
    return Array.from(categoriesSet).sort();
  }, [products]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'ALL' ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Manejador de eliminación con confirmación y refresh
  const handleDelete = async (id: string, name: string) => {
    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar "${name}"?`);
    if (!confirmDelete) return;

    const res = await deleteProduct(id);

    if (res?.success) {
      if (editingProduct?.id === id) {
        setEditingProduct(null);
      }
      router.refresh();
    } else {
      alert(`Error al eliminar: ${res?.error || 'No se pudo eliminar el insumo'}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario de Alta / Edición */}
      <div className="lg:col-span-1 space-y-3">
        <SupplyForm
          key={editingProduct ? editingProduct.id : 'new'}
          productToEdit={editingProduct}
          onSuccess={() => setEditingProduct(null)}
          existingSuppliers={existingSuppliers}
        />
        {editingProduct && (
          <button
            onClick={() => setEditingProduct(null)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg transition cursor-pointer"
          >
            ❌ Cancelar Edición
          </button>
        )}
      </div>

      {/* Lista de Insumos con Filtros */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        {/* ENCABEZADO Y FILTROS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <h2 className="text-sm font-semibold text-white whitespace-nowrap">
            Insumos Registrados ({filteredProducts.length})
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Buscador */}
            <input
              type="text"
              placeholder="🔍 Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-44 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />

            {/* Selector de Categorías */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">🔍 Todas las categorías</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTA */}
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No se encontraron insumos con los filtros aplicados.
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-lg border transition ${
                  editingProduct?.id === item.id
                    ? 'bg-amber-950/20 border-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">{item.name}</div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="bg-amber-500/10 text-amber-400 font-medium px-2 py-0.5 rounded border border-amber-500/20">
                      {item.category}
                    </span>
                    {item.supplier && (
                      <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        📦 {item.supplier}
                      </span>
                    )}
                    <span className="text-slate-400">
                      Costo: ${Number(item.costPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs font-mono text-slate-400">
                    <div>Capacidad: {item.capacity} {item.unit || 'ml'}</div>
                    <div className="text-[11px] text-slate-500">
                      Tara: {item.tareWeight || 0}g
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                    <button
                      onClick={() => setEditingProduct(item)}
                      className="text-slate-400 hover:text-amber-400 text-xs p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
                      title="Editar insumo"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="text-slate-500 hover:text-red-400 text-xs p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
                      title="Eliminar insumo"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}