'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerWarehouseAdjustment } from '@/app/actions'; // <-- Importamos la Server Action

interface ProductItem {
  id: string;
  name: string;
  category?: string;
  subtype?: string;
  warehouseStock: number;
  stockClosed: number;
  costPrice: number;
  supplier?: string;
  unit?: string;
  warehouseMinStock?: number;
  warehouseMaxStock?: number;
}

interface AuditLogItem {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  physicalStock: number;
  difference: number;
  unitCost: number;
  totalLoss: number;
  createdAt: string | Date;
}

const SUBGROUPS = [
  'TODOS',
  'DESTILADOS',
  'VINOS',
  'FRUTAS Y VERDURAS',
  'PREPARACIONES Y JARABES',
  'ABARROTES',
  'MEZCLADORES Y REFRESCOS',
  '📋 HISTORIAL DE MERMAS / AJUSTES',
  '⚙️ CONFIGURAR MÁXIMOS Y MÍNIMOS',
];

export default function WarehouseClient({
  products = [],
  auditLogs = [],
  existingSuppliers = [],
}: {
  products: ProductItem[];
  auditLogs: AuditLogItem[];
  existingSuppliers: string[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [activeSubgroup, setActiveSubgroup] = useState('TODOS');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Estados locales para edición rápida de Límites de Almacén
  const [limitsState, setLimitsState] = useState<{ [key: string]: { min: number; max: number } }>({});
  const [savingLimitId, setSavingLimitId] = useState<string | null>(null);

  // ESTADOS PARA EL MODAL DE MERMAS / AJUSTES
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjSearchTerm, setAdjSearchTerm] = useState('');
  const [adjProductId, setAdjProductId] = useState('');
  const [adjType, setAdjType] = useState<'MERMA' | 'SOBRANTE'>('MERMA');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Función para determinar si usa piezas o gramaje estricto
  const getProductUnit = (p: ProductItem) => {
    const catLower = (p.category || '').toLowerCase();
    const isLiquorOrWineOrMixer = [
      'destilado', 'vinos', 'licores', 'vino', 'tequila', 'mezcal', 'ron', 'gin', 'whisky', 'vodka', 'prosecco', 'champagne', 'mezclador', 'refresco', 'agua'
    ].some((c) => catLower.includes(c));

    if (isLiquorOrWineOrMixer) return 'pza';
    return (p.unit && p.unit.trim() !== '' && p.unit !== 'ml') ? p.unit : 'g';
  };

  const filteredProducts = products.filter((p) => {
    const nameMatch = (p.name || '').toLowerCase();
    const categoryMatch = (p.category || '').toLowerCase();
    const subtypeMatch = (p.subtype || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = nameMatch.includes(search) || categoryMatch.includes(search) || subtypeMatch.includes(search);
    const matchesSupplier = !selectedSupplier || (p.supplier || '').trim().toLowerCase() === selectedSupplier.trim().toLowerCase();
    
    const cat = (p.category || '').toUpperCase();
    const sub = (p.subtype || '').toUpperCase();
    
    let matchesSubgroup = true;
    if (activeSubgroup !== 'TODOS' && activeSubgroup !== '📋 HISTORIAL DE MERMAS / AJUSTES' && activeSubgroup !== '⚙️ CONFIGURAR MÁXIMOS Y MÍNIMOS') {
      if (activeSubgroup === 'DESTILADOS') {
        matchesSubgroup = cat.includes('DESTILADO') || sub.includes('DESTILADO');
      } else if (activeSubgroup === 'VINOS') {
        matchesSubgroup = cat.includes('VINO') || sub.includes('VINO');
      } else if (activeSubgroup === 'FRUTAS Y VERDURAS') {
        matchesSubgroup = cat.includes('FRUTA') || cat.includes('VERDURA');
      } else if (activeSubgroup === 'PREPARACIONES Y JARABES') {
        matchesSubgroup = cat.includes('PREPARACION') || cat.includes('JARABE');
      } else if (activeSubgroup === 'ABARROTES') {
        matchesSubgroup = cat.includes('ABARROTE');
      } else if (activeSubgroup === 'MEZCLADORES Y REFRESCOS') {
        matchesSubgroup = cat.includes('MEZCLADOR') || cat.includes('REFRESCO') || cat.includes('AGUA') || cat.includes('MIX');
      }
    }

    return matchesSearch && matchesSupplier && matchesSubgroup;
  });

  const totalWarehouseUnits = products.reduce((acc, p) => acc + (Number(p.warehouseStock) || 0), 0);
  const totalWarehouseValue = products.reduce((acc, p) => acc + ((Number(p.warehouseStock) || 0) * (Number(p.costPrice) || 0)), 0);

  const handleSaveStock = async (productId: string) => {
    const val = parseInt(tempStock, 10);
    if (isNaN(val) || val < 0) {
      alert('Ingresa una cantidad válida.');
      return;
    }

    try {
      setLoadingId(productId);
      const res = await fetch('/api/warehouse/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, newWarehouseStock: val }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');

      setEditingId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el ajuste.');
    } finally {
      setLoadingId(null);
    }
  };

  // MANEJADOR PARA GUARDAR LA MERMA/AJUSTE
  const handleSubmitAdjustment = async () => {
    if (!adjProductId || adjQty <= 0) {
      alert('Selecciona un producto y una cantidad válida mayor a 0.');
      return;
    }

    try {
      setIsAdjusting(true);
      // Si es merma, la cantidad es negativa para que descuente. Si es sobrante, es positiva.
      const finalQty = adjType === 'MERMA' ? -Math.abs(adjQty) : Math.abs(adjQty);
      
      const res = await registerWarehouseAdjustment(adjProductId, finalQty);
      
      if (!res.success) throw new Error(res.error);
      
      alert(res.message);
      setIsAdjustModalOpen(false);
      setAdjSearchTerm('');
      setAdjProductId('');
      setAdjQty(1);
      setAdjType('MERMA');
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Error al registrar el ajuste.');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans text-slate-100 relative">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🏢 Almacén Central / CEDIS
          </h1>
          <p className="text-sm text-slate-400">
            Control de existencias globales, auditoría, mermas y configuración de umbrales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition shadow flex items-center gap-2 cursor-pointer"
          >
            📉 Registrar Merma / Ajuste
          </button>
          <Link
            href="/purchases"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition shadow"
          >
            📦 Ir a Registrar Compras
          </Link>
          <Link
            href="/"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2.5 rounded-lg transition"
          >
            ← Menú Principal
          </Link>
        </div>
      </div>

      {/* Menú de Subgrupos */}
      <div className="flex flex-wrap gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl shadow-lg">
        {SUBGROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setActiveSubgroup(group)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubgroup === group
                ? group.includes('HISTORIAL')
                  ? 'bg-rose-600 text-white shadow'
                  : group.includes('CONFIGURAR')
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-amber-500 text-slate-950 shadow'
                : group.includes('HISTORIAL')
                  ? 'text-rose-400 hover:bg-slate-800'
                  : group.includes('CONFIGURAR')
                    ? 'text-sky-400 hover:bg-slate-800'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Tarjetas de Resumen */}
      {activeSubgroup !== '📋 HISTORIAL DE MERMAS / AJUSTES' && activeSubgroup !== '⚙️ CONFIGURAR MÁXIMOS Y MÍNIMOS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-1">
            <span className="text-xs text-slate-400 uppercase font-semibold">Unidades Totales en Almacén</span>
            <div className="text-2xl font-bold text-amber-400 font-mono">{totalWarehouseUnits} piezas</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-1">
            <span className="text-xs text-slate-400 uppercase font-semibold">Valor Total del Almacén (CEDIS)</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              ${totalWarehouseValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {activeSubgroup !== '📋 HISTORIAL DE MERMAS / AJUSTES' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            🔍 Búsqueda y Proveedor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar insumo o categoría (tequila, gin, etc.)..."
              className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500"
            />
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-amber-400 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">Todos los proveedores</option>
              {existingSuppliers.map((sup) => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* VISTA 1: CONFIGURAR MÁXIMOS Y MÍNIMOS */}
      {activeSubgroup === '⚙️ CONFIGURAR MÁXIMOS Y MÍNIMOS' ? (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4">
          <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">⚙️ Configuración de Umbrales de Almacén</h2>
              <p className="text-xs text-slate-400">Modifica los valores que necesites y guarda todos los cambios con un solo botón.</p>
            </div>
            <button
              type="button"
              disabled={savingLimitId === 'all'}
              onClick={async () => {
                const itemsToSave = Object.entries(limitsState).map(([productId, vals]) => ({
                  productId,
                  warehouseMinStock: vals.min,
                  warehouseMaxStock: vals.max,
                }));

                if (itemsToSave.length === 0) {
                  alert('No has modificado ningún límite.');
                  return;
                }

                try {
                  setSavingLimitId('all');
                  const res = await fetch('/api/warehouse/limits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: itemsToSave }),
                  });

                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Error al guardar');

                  alert('¡Todos los límites de almacén se han actualizado con éxito!');
                  setLimitsState({});
                  router.refresh();
                } catch (err: any) {
                  alert(err.message || 'Error al guardar los límites.');
                } finally {
                  setSavingLimitId(null);
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer shadow uppercase tracking-wider"
            >
              {savingLimitId === 'all' ? 'Guardando Cambios...' : '💾 Guardar Todos los Cambios'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 pl-6">Insumo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Mínimo Almacén</th>
                  <th className="py-3 px-4 text-center pr-6">Máximo Almacén</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((p) => {
                  const currentMin = limitsState[p.id]?.min ?? p.warehouseMinStock ?? 1;
                  const currentMax = limitsState[p.id]?.max ?? p.warehouseMaxStock ?? 5;
                  const unitLabel = getProductUnit(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 pl-6 font-medium text-white">{p.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-400">{p.category || 'General'}</td>
                      <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                        {p.warehouseStock} {unitLabel}
                      </td>
                      
                      <td className="py-3 px-4 text-center font-mono">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentMin}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLimitsState((prev) => ({
                                ...prev,
                                [p.id]: { min: val, max: currentMax },
                              }));
                            }}
                            className="w-24 bg-slate-950 border border-slate-800 rounded p-1.5 text-center text-white text-xs outline-none focus:border-amber-500 font-bold"
                          />
                          <span className="text-xs text-slate-400 font-medium">{unitLabel}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono pr-6">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentMax}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLimitsState((prev) => ({
                                ...prev,
                                [p.id]: { min: currentMin, max: val },
                              }));
                            }}
                            className="w-24 bg-slate-950 border border-slate-800 rounded p-1.5 text-center text-white text-xs outline-none focus:border-amber-500 font-bold"
                          />
                          <span className="text-xs text-slate-400 font-medium">{unitLabel}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeSubgroup === '📋 HISTORIAL DE MERMAS / AJUSTES' ? (
        /* VISTA 2: HISTORIAL DE MERMAS */
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">🚨 Bitácora de Diferencias y Pérdidas en Almacén</h2>
            <span className="text-xs text-rose-400 font-mono">{auditLogs.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay registros de diferencias o mermas en el almacén todavía.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 pl-6">Fecha / Hora</th>
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-4 text-center">Sistema</th>
                    <th className="py-3 px-4 text-center">Físico</th>
                    <th className="py-3 px-4 text-center">Diferencia</th>
                    <th className="py-3 px-4 text-right">Costo Unitario</th>
                    <th className="py-3 px-4 text-right pr-6">Pérdida Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLogs.map((log) => {
                    const diff = Number(log.difference) || 0;
                    const loss = Number(log.totalLoss) || 0;
                    const dateFormatted = new Date(log.createdAt).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 pl-6 text-xs text-slate-400 font-mono">{dateFormatted}</td>
                        <td className="py-3 px-4 font-medium text-white">{log.productName}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">{log.previousStock} pzas</td>
                        <td className="py-3 px-4 text-center font-mono text-white font-bold">{log.physicalStock} pzas</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span className={diff < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {diff > 0 ? `+${diff}` : diff} pzas
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-300">
                          ${Number(log.unitCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right pr-6 font-mono text-xs font-bold text-rose-400">
                          {loss < 0 ? `-$${Math.abs(loss).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : (
        /* VISTA 3: INVENTARIO NORMAL DE ALMACÉN */
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">
              📋 Inventario Físico de Almacén <span className="text-amber-400">({activeSubgroup})</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">{filteredProducts.length} productos</span>
          </div>

          <div className="overflow-x-auto">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No se encontraron productos en este subgrupo.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 pl-6">Insumo / Producto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4 text-center">Stock en Almacén (CEDIS)</th>
                    <th className="py-3 px-4 text-right">Costo Unitario</th>
                    <th className="py-3 px-4 text-right pr-6">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProducts.map((p) => {
                    const whStock = Number(p.warehouseStock) || 0;
                    const cost = Number(p.costPrice) || 0;
                    const totalVal = whStock * cost;
                    const isEditing = editingId === p.id;
                    const isLoading = loadingId === p.id;
                    const unitLabel = getProductUnit(p);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 pl-6 font-medium text-white">{p.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-400">{p.category || 'General'}</td>
                        <td className="py-3 px-4 text-xs text-amber-400/80">{p.supplier || 'N/D'}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                value={tempStock}
                                onChange={(e) => setTempStock(e.target.value)}
                                className="w-20 bg-slate-950 border border-amber-500 rounded px-2 py-1 text-center text-white text-sm outline-none font-bold"
                                autoFocus
                              />
                              <span className="text-xs text-slate-400">{unitLabel}</span>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleSaveStock(p.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-bold"
                              >
                                {isLoading ? '...' : '✓'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1 rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(p.id);
                                setTempStock(whStock.toString());
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/60 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/50 rounded-lg text-amber-400 font-bold transition cursor-pointer"
                            >
                              <span>{whStock} {unitLabel}</span>
                              <span className="text-[10px] text-slate-500">✏️</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-300">
                          ${cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right pr-6 font-mono text-xs font-bold text-emerald-400">
                          ${totalVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* MODAL DE AJUSTE / MERMA */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                📉 Registrar Ajuste de Almacén
              </h3>
              <button 
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Buscador de Insumo */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Insumo a modificar</label>
                <input
                  list="adjust-products-list"
                  type="text"
                  value={adjSearchTerm}
                  onChange={(e) => {
                    setAdjSearchTerm(e.target.value);
                    const prod = products.find((p) => p.name.toLowerCase() === e.target.value.trim().toLowerCase());
                    setAdjProductId(prod ? prod.id : '');
                  }}
                  placeholder="Escribe para buscar..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-sm outline-none focus:border-amber-500"
                />
                <datalist id="adjust-products-list">
                  {products.map((p) => (
                    <option key={`adj-${p.id}`} value={p.name} />
                  ))}
                </datalist>
                {adjProductId && (
                  <p className="text-xs text-emerald-400 mt-1.5 font-medium">✓ Producto seleccionado correctamente</p>
                )}
              </div>

              {/* Tipo de Ajuste */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Tipo de movimiento</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAdjType('MERMA')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition border ${
                      adjType === 'MERMA' 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    Merma (Descontar)
                  </button>
                  <button
                    onClick={() => setAdjType('SOBRANTE')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition border ${
                      adjType === 'SOBRANTE' 
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    Sobrante (Sumar)
                  </button>
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cantidad de piezas / unidades</label>
                <input
                  type="number"
                  min="1"
                  value={adjQty}
                  onChange={(e) => setAdjQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-center text-lg outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              {/* Botón Guardar */}
              <button
                disabled={!adjProductId || isAdjusting}
                onClick={handleSubmitAdjustment}
                className={`w-full py-3 rounded-lg text-sm font-bold transition uppercase tracking-wider shadow-lg ${
                  !adjProductId || isAdjusting 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : adjType === 'MERMA' 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                      : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {isAdjusting ? 'Procesando...' : `Confirmar ${adjType === 'MERMA' ? 'Merma' : 'Sobrante'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}