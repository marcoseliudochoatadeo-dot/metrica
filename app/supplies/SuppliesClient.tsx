'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createProduct, updateProduct, deleteProduct } from '@/app/actions';

export default function SuppliesClient({ initialProducts = [] }: { initialProducts: any[] }) {
  const [selectedCategory, setSelectedCategory] = useState('Destilados');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Evaluar si la categoría seleccionada es Vinos o Destilados
  const isLiquor = ['destilados', 'vinos', 'licores'].includes(selectedCategory.toLowerCase());
  const isEditingLiquor = editingProduct 
    ? ['destilados', 'vinos', 'licores'].includes((editingProduct.category || '').toLowerCase())
    : false;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo de Insumos</h1>
          <p className="text-sm text-slate-400">
            Alta, edición y registro maestro de materias primas y botellas.
          </p>
        </div>
        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg transition"
        >
          ← Volver a Inicio
        </Link>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Registrar Nuevo Insumo</h2>
        
        <form action={createProduct} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre del Insumo</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ej. Mezcal Espadín, Limón Verde"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Categoría</label>
            <select
              name="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Destilados">Destilados</option>
              <option value="Vinos">Vinos</option>
              <option value="Frutas y Verduras">Frutas y Verduras</option>
              <option value="Mezcladores">Mezcladores / Refrescos</option>
              <option value="Jarabes y Preparaciones">Jarabes y Preparaciones</option>
              <option value="Abarrotes">Abarrotes</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Unidad de Medida</label>
            <select
              name="unit"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ml">Mililitros (ml)</option>
              <option value="g">Gramos (g)</option>
              <option value="pza">Pieza (pza)</option>
              <option value="oz">Onzas (oz)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Capacidad / Contenido Nominal</label>
            <input
              type="number"
              name="capacity"
              step="any"
              required
              placeholder="Ej. 750 (botella) o 1000 (1kg)"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Peso Tara Botella Vacía (g) {!isLiquor && <span className="text-slate-500">(No aplica)</span>}
            </label>
            <input
              type="number"
              name="tareWeight"
              step="any"
              defaultValue="0"
              disabled={!isLiquor}
              placeholder={isLiquor ? "Ej. 450" : "N/A"}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none transition ${
                isLiquor
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                  : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Costo de Compra ($)</label>
            <input
              type="number"
              name="costPrice"
              step="any"
              required
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Stock Inicial (Cerradas/Unidades)</label>
            <input
              type="number"
              step="any"
              name="closedStock"
              defaultValue="1"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-2 px-4 rounded transition cursor-pointer"
            >
              + Agregar Insumo
            </button>
          </div>
        </form>
      </div>

      {/* TABLA DE PRODUCTOS REGISTRADOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-800/40 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Insumos Registrados ({initialProducts.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Insumo</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Capacidad Nominal</th>
                <th className="py-3 px-4">Tara</th>
                <th className="py-3 px-4">Costo</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {initialProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                    No hay insumos registrados aún. Agrega el primero usando el formulario de arriba.
                  </td>
                </tr>
              ) : (
                initialProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-medium text-white">{item.name}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {item.capacity} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {item.tareWeight > 0 ? `${item.tareWeight} g` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400">
                      ${Number(item.costPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(item)}
                        className="text-xs text-amber-500 hover:text-amber-400 font-medium cursor-pointer"
                      >
                        Editar
                      </button>

                      <form action={deleteProduct} className="inline">
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="text-xs text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE INSUMO */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Editar Insumo: {editingProduct.name}</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateProduct(formData);
                setEditingProduct(null);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input type="hidden" name="id" value={editingProduct.id} />

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del Insumo</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingProduct.name}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                <select
                  name="category"
                  defaultValue={editingProduct.category}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
                  }
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Destilados">Destilados</option>
                  <option value="Vinos">Vinos</option>
                  <option value="Frutas y Verduras">Frutas y Verduras</option>
                  <option value="Mezcladores">Mezcladores / Refrescos</option>
                  <option value="Jarabes y Preparaciones">Jarabes y Preparaciones</option>
                  <option value="Abarrotes">Abarrotes</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Unidad de Medida</label>
                <select
                  name="unit"
                  defaultValue={editingProduct.unit}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ml">Mililitros (ml)</option>
                  <option value="g">Gramos (g)</option>
                  <option value="pza">Pieza (pza)</option>
                  <option value="oz">Onzas (oz)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Capacidad / Contenido Nominal</label>
                <input
                  type="number"
                  
                  name="capacity"
                  step="any"
                  defaultValue={editingProduct.capacity}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Peso Tara Botella Vacía (g) {!isEditingLiquor && <span className="text-slate-500">(No aplica)</span>}
                </label>
                <input
                  type="number"
                  name="tareWeight"
                  step="any"
                  defaultValue={editingProduct.tareWeight || 0}
                  disabled={!isEditingLiquor}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none transition ${
                    isEditingLiquor
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500'
                      : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Costo de Compra ($)</label>
                <input
                  type="number"
                  name="costPrice"
                  step="any"
                  defaultValue={editingProduct.costPrice}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Stock Cerradas / Unidades</label>
                <input
                  type="number"
                  step="any"
                  name="closedStock"
                  defaultValue={editingProduct.closedStock || 0}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded transition cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}