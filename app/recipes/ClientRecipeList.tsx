'use client';

import React from 'react';
import { deleteRecipe } from '@/app/recipe-actions';

interface ClientRecipeListProps {
  recipes: any[];
  isSubrecipe: boolean;
  onEditRecipe: (recipe: any) => void;
}

export default function ClientRecipeList({ recipes, isSubrecipe, onEditRecipe }: ClientRecipeListProps) {
  return (
    <section className="lg:col-span-2 space-y-4">
      <h2 className="text-lg font-semibold text-slate-200">
        {isSubrecipe ? 'Subrecetas Registradas' : 'Recetas Registradas'} ({recipes.length})
      </h2>

      {recipes.length === 0 ? (
        <p className="text-slate-500 text-sm italic bg-slate-800/40 p-6 rounded-2xl border border-slate-800">
          {isSubrecipe
            ? 'No hay subrecetas registradas todavía. Al crear una, se añadirá automáticamente al inventario de insumos.'
            : 'No hay recetas registradas en esta categoría.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.map((r: any) => {
            // Cálculo de costo de producción con CONVERSIÓN AUTOMÁTICA DE UNIDADES
            const totalCost = (r.items || []).reduce(
              (acc: number, item: any) => {
                const product = item.product;
                if (!product) return acc;

                const costPrice = Number(product.costPrice || 0);
                const capacity = Number(product.capacity || 1);
                
                const unitCost = capacity > 0 ? costPrice / capacity : 0;

                const recipeUnit = (item.unit || 'ml').toLowerCase();
                const productUnit = (product.unit || 'ml').toLowerCase();
                const rawQuantity = Number(item.quantity || 0);

                let conversionFactor = 1;
                if ((recipeUnit === 'gr' && productUnit === 'kg') || (recipeUnit === 'ml' && productUnit === 'lt')) {
                  conversionFactor = 0.001;
                } else if ((recipeUnit === 'kg' && productUnit === 'gr') || (recipeUnit === 'lt' && productUnit === 'ml')) {
                  conversionFactor = 1000;
                }

                const adjustedQuantity = rawQuantity * conversionFactor;
                return acc + (unitCost * adjustedQuantity);
              },
              0
            );

            const salePrice = Number(r.price || r.salePrice || 0);
            const profitMargin =
              salePrice > 0 && !isSubrecipe
                ? (((salePrice - totalCost) / salePrice) * 100).toFixed(1)
                : '0';

            return (
              <div
                key={r.id}
                className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between"
              >
                <div>
                  {r.imageUrl && (
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      className="w-full h-32 object-cover rounded-xl mb-3 border border-slate-700"
                    />
                  )}
                  <h3 className="font-bold text-amber-400 text-base">
                    {r.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {r.description || 'Sin descripción.'}
                  </p>

                  <div className="mt-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                    {!isSubrecipe && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Precio Venta:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          ${salePrice.toFixed(2)} MXN
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {isSubrecipe ? 'Costo de Producción (Lote):' : 'Costo Trago:'}
                      </span>
                      <span className="font-bold text-red-400 font-mono">
                        ${totalCost.toFixed(2)} MXN
                      </span>
                    </div>
                    {!isSubrecipe && (
                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Margen Utility:</span>
                        <span className="font-bold text-amber-400 font-mono">
                          {profitMargin}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                      Insumos / Ingredientes:
                    </span>
                    <ul className="text-xs text-slate-300 mt-1 space-y-1">
                      {(r.items || []).map((item: any) => (
                        <li key={item.id} className="flex justify-between text-[11px]">
                          <span>• {item.product?.name || 'Insumo'}</span>
                          <span className="font-mono text-slate-400">
                            {item.quantity} {item.unit || 'ml'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      onEditRecipe(r);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    ✏️ Editar
                  </button>

                  <form action={deleteRecipe.bind(null, r.id)}>
                    <button
                      type="submit"
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}