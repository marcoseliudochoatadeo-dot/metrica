'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SalesAuditClient from './SalesAuditClient';
import { deleteSale } from '@/app/actions';

export default function SalesPageClient({
  recipes,
  products,
  pendingSales,
  existingSuppliers,
}: {
  recipes: any[];
  products: any[];
  pendingSales: any[];
  existingSuppliers: string[];
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [isPending, startTransition] = useTransition();
  
  // NUEVO: Estado para llevar el control de las ventas seleccionadas
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  const filteredSales = pendingSales.filter((sale: any) => {
    if (!selectedDate) return true;
    
    const saleDate = new Date(sale.createdAt || Date.now());
    const year = saleDate.getFullYear();
    const month = String(saleDate.getMonth() + 1).padStart(2, '0');
    const day = String(saleDate.getDate()).padStart(2, '0');
    const saleDateLocal = `${year}-${month}-${day}`;

    return saleDateLocal === selectedDate;
  });

  // Lógica para borrar una sola venta (botón individual)
  const handleDelete = (saleId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta venta? Se reintegrarán los insumos al inventario y se corregirá el stock.')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteSale(saleId);
        alert('¡Venta eliminada y stock reintegrado con éxito!');
        router.refresh();
      } catch (error: any) {
        alert(`Error al eliminar la venta: ${error.message || 'Error desconocido'}`);
      }
    });
  };

  // NUEVO: Lógica para borrar múltiples ventas a la vez
  const handleBulkDelete = () => {
    if (!confirm(`¿Estás seguro de eliminar las ${selectedSales.length} ventas seleccionadas? Todo el stock se reintegrará automáticamente.`)) {
      return;
    }

    startTransition(async () => {
      try {
        // Borramos secuencialmente para no saturar la conexión a la base de datos
        for (const saleId of selectedSales) {
          await deleteSale(saleId);
        }
        alert(`¡${selectedSales.length} ventas eliminadas y stock reintegrado con éxito!`);
        setSelectedSales([]); // Limpiamos la selección después de borrar
        router.refresh();
      } catch (error: any) {
        alert(`Error al eliminar las ventas: ${error.message || 'Error desconocido'}`);
      }
    });
  };

  // NUEVO: Seleccionar o deseleccionar todas las filas
  const toggleSelectAll = () => {
    if (selectedSales.length === filteredSales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(filteredSales.map((s: any) => s.id));
    }
  };

  // NUEVO: Seleccionar o deseleccionar una fila individual
  const toggleSelect = (id: string) => {
    if (selectedSales.includes(id)) {
      setSelectedSales(selectedSales.filter(saleId => saleId !== id));
    } else {
      setSelectedSales([...selectedSales, id]);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 Punto de Venta y Pedidos</h1>
          <p className="text-sm text-slate-400">
            Registro ágil de salidas, copeo y control de pedidos por proveedor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg transition"
          >
            ← Ir a Inventario
          </Link>
        </div>
      </div>

      <SalesAuditClient
        recipes={recipes}
        products={products}
        logs={[]}
        pendingSales={pendingSales}
        existingSuppliers={existingSuppliers}
      />

      {/* Tabla de Registro de Ventas */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">📋 Ventas Registradas en el Turno Actual</h2>
            <span className="text-xs text-amber-400 font-mono">{filteredSales.length} transacciones mostradas (de {pendingSales.length} totales)</span>
          </div>

          <div className="flex items-center gap-4">
            {/* BOTÓN DE BORRADO MASIVO (Aparece solo si hay seleccionados) */}
            {selectedSales.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                🗑️ Borrar {selectedSales.length} seleccionadas
              </button>
            )}

            {/* Filtro de Fecha */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 pl-2">📅 Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none px-2 py-1 text-xs text-amber-400 font-semibold outline-none cursor-pointer"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded transition cursor-pointer mr-1"
                  title="Limpiar filtro de fecha"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No hay ventas registradas para la fecha seleccionada.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 pl-6 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedSales.length === filteredSales.length && filteredSales.length > 0} 
                      onChange={toggleSelectAll} 
                      className="cursor-pointer accent-amber-500 w-4 h-4"
                    />
                  </th>
                  <th className="py-3 px-2">Fecha / Hora</th>
                  <th className="py-3 px-4">Tipo / Concepto</th>
                  <th className="py-3 px-4 text-center">Modo</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4 text-right">Costo de Insumos</th>
                  <th className="py-3 px-4 text-right">Precio de Venta / Subtotal</th>
                  <th className="py-3 px-4 text-center pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSales.map((sale: any, idx: number) => {
                  const dateFormatted = new Date(sale.createdAt || Date.now()).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  const subtotal = Number(sale.price || 0);
                  const itemCost = Number(sale.cost || 0);
                  const isSelected = selectedSales.includes(sale.id);

                  return (
                    <tr key={sale.id || idx} className={`transition ${isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'}`}>
                      <td className="py-3 px-4 pl-6 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(sale.id)}
                          className="cursor-pointer accent-amber-500 w-4 h-4"
                        />
                      </td>
                      <td className="py-3 px-2 text-xs font-mono text-slate-400 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {sale.recipe?.name ? `🍹 [Cóctel] ${sale.recipe.name}` : sale.product?.name ? `🍾 [Producto] ${sale.product.name}` : 'Venta de barra'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/20">
                          {sale.saleMode || 'RECETA'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-300">
                        {sale.quantity} <span className="text-slate-500">{sale.saleMode === 'BOTELLA' || sale.saleMode === 'RECETA' || sale.saleMode === 'PIEZA' ? 'pza(s)' : 'ml'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-rose-400">
                        ${itemCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-400">
                        ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center pr-6">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(sale.id)}
                          className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-500/20 transition cursor-pointer disabled:opacity-50"
                          title="Eliminar venta y reponer inventario"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}