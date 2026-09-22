'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getProductionRecipes, registerProduction } from '@/app/actions';

export default function ProductionModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Cargar las recetas al abrir el modal
  useEffect(() => {
    if (isOpen && recipes.length === 0) {
      getProductionRecipes().then((res) => {
        if (res.success) setRecipes(res.data);
      });
    }
  }, [isOpen]);

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProduce = (recipe: any) => {
    const qtyStr = batches[recipe.id];
    const qty = parseFloat(qtyStr);
    
    if (!qty || qty <= 0) {
      alert('Ingresa una cantidad válida de recetas a producir.');
      return;
    }

    if (confirm(`¿Confirmas la producción de ${qty} receta(s) de ${recipe.name}?\n\nSe sumarán ${qty * recipe.yieldQuantity}${recipe.yieldUnit} a tu stock y se descontarán los insumos correspondientes.`)) {
      startTransition(async () => {
        const res = await registerProduction(recipe.id, qty);
        if (res.success) {
          alert('¡Producción registrada con éxito!');
          setBatches({ ...batches, [recipe.id]: '' }); // Limpiar casilla
          router.refresh(); // Actualiza el inventario de fondo
        } else {
          alert(`Error: ${res.error}`);
        }
      });
    }
  };

  return (
    <>
      {/* Botón Verde Principal */}
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-lg flex items-center gap-2 border border-emerald-500"
      >
        🍹 Registrar Preparado (Bateo)
      </button>

      {/* Fondo oscuro del Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-lg font-bold text-amber-400">🍹 Registrar Producción de Jarabes / Bateo</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
            </div>

            {/* Buscador */}
            <div className="p-4 bg-slate-900 border-b border-slate-800">
              <input
                type="text"
                placeholder="🔍 Buscar subreceta o jarabe (Ej. Jarabe Natural)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-3 text-sm outline-none focus:border-amber-500"
              />
            </div>

            {/* Lista de Recetas */}
            <div className="overflow-y-auto p-4 flex-1 space-y-3">
              {filteredRecipes.length === 0 ? (
                <p className="text-slate-500 text-center text-sm py-10">No se encontraron recetas.</p>
              ) : (
                filteredRecipes.map((recipe) => (
                  <div key={recipe.id} className="flex flex-col sm:flex-row items-center justify-between bg-slate-800/50 border border-slate-700 p-4 rounded-lg gap-4">
                    
                    {/* Info de la receta */}
                    <div className="flex-1 w-full">
                      <h3 className="font-bold text-white text-sm">{recipe.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Rendimiento por receta: <span className="text-emerald-400 font-semibold">{recipe.yieldQuantity} {recipe.yieldUnit}</span>
                      </p>
                    </div>

                    {/* Controles de producción */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 uppercase mb-1">Cant. Recetas</span>
                        <input
                          type="number" min="0.1" step="any" placeholder="Ej. 1"
                          value={batches[recipe.id] || ''}
                          onChange={(e) => setBatches({ ...batches, [recipe.id]: e.target.value })}
                          className="w-20 bg-slate-950 border border-slate-600 rounded px-2 py-1.5 text-center text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                      <button
                        onClick={() => handleProduce(recipe)}
                        disabled={isPending}
                        className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded text-xs transition disabled:opacity-50 whitespace-nowrap"
                      >
                        {isPending ? 'Guardando...' : 'Producir'}
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}