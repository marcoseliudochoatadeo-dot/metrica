'use client';

import { useState } from 'react';
import SupplyList from './SupplyList';
import ImportExcelModal from './ImportExcelModal';
import SuppliersDirectory from './SuppliersDirectory'; // Asegúrate de ajustar la ruta al componente que hicimos antes

export default function SuppliesClientContainer({
  products,
  suppliers,
  existingSuppliers,
}: {
  products: any[];
  suppliers: any[];
  existingSuppliers: string[];
}) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'suppliers'>('catalog');

  return (
    <div className="space-y-6">
      {/* Pestañas locales */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-amber-600 text-slate-950 shadow-lg shadow-amber-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          📦 Catálogo de Insumos ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-amber-600 text-slate-950 shadow-lg shadow-amber-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🏢 Directorio de Proveedores ({suppliers.length})
        </button>
      </div>

      {/* Contenido según la pestaña activa */}
      {activeTab === 'catalog' ? (
        <div className="space-y-6">
          <ImportExcelModal />
          <SupplyList products={products} existingSuppliers={existingSuppliers} />
        </div>
      ) : (
        <SuppliersDirectory initialSuppliers={suppliers} />
      )}
    </div>
  );
}