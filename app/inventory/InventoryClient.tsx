'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { exportInventoryToExcel } from '@/app/actions';
import ProductionModal from './ProductionModal'; // IMPORTADO AQUI

export default function InventoryClient({ products = [] }: { products: any[] }) {
  const [activeTab, setActiveTab] = useState('destilados');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubtypeFilter, setSelectedSubtypeFilter] = useState('ALL');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const tabs = [
    {
      id: 'destilados',
      label: '🍾 Destilados',
      categories: ['destilado / licor', 'destilados', 'licores', 'tequila', 'mezcal', 'ron', 'gin', 'whisky', 'vodka', 'brandy', 'cognac'],
    },
    {
      id: 'vinos',
      label: '🍷 Vinos',
      categories: ['vino', 'vinos', 'tinto', 'blanco', 'rosado', 'espumoso', 'prosecco', 'champagne'],
    },
    {
      id: 'frutas',
      label: '🍋 Frutas y Verduras',
      categories: ['frutas', 'frutas y verduras', 'verduras', 'fruta'],
    },
    {
      id: 'preparaciones',
      label: '🍯 Preparaciones y Jarabes',
      categories: ['preparaciones', 'jarabes', 'jarabes y preparaciones', 'preparacion', 'cordial', 'subreceta'],
    },
    {
      id: 'abarrotes',
      label: '📦 Abarrotes',
      categories: ['abarrotes', 'abarrote', 'otro'],
    },
    {
      id: 'mezcladores',
      label: '🥤 Mezcladores y Refrescos',
      categories: ['mezcladores', 'mezcladores / refrescos', 'refrescos'],
    },
  ];

  const currentTabInfo = tabs.find((t) => t.id === activeTab);

  const enrichedProducts = useMemo(() => {
    return products.map((item) => {
      const catLower = (item.category || '').toLowerCase();
      
      const isLiquorOrWine = [
        'destilado / licor', 'destilados', 'vinos', 'licores', 'vino', 'tinto', 'blanco', 'rosado', 'espumoso', 'tequila', 'mezcal', 'ron', 'gin', 'whisky', 'vodka', 'prosecco', 'champagne'
      ].some((c) => catLower.includes(c));

      const capacity = Number(item.capacity) || 750;
      const tara = Number(item.tareWeight) || 0;
      const rawClosed = Number(item.stockClosed) || 0;
      const rawWeight = Number(item.currentWeight) || 0;
      const method = item.measurementMethod || 'SCALE';
      
      let stockVal = rawClosed;
      let openRatio = 0;
      let displayMlOrValue = 0;

      if (isLiquorOrWine && capacity > 0) {
        if (method === 'PORTION') {
          let totalPortion = 0;
          if (item.openBottles && item.openBottles.length > 0) {
            totalPortion = item.openBottles.reduce((acc: number, b: any) => acc + (Number(b.value) || 0), 0);
          } else {
            totalPortion = rawWeight; 
          }

          openRatio = totalPortion; 
          displayMlOrValue = openRatio * capacity; 
        } else {
          // MÉTODO BÁSCULA (GRAMOS)
          if (item.openBottles && item.openBottles.length > 0) {
            const totalNetMl = item.openBottles.reduce((acc: number, b: any) => {
              const bruto = Number(b.value) || 0;
              const neto = bruto - tara; 
              return acc + neto;
            }, 0);

            displayMlOrValue = totalNetMl;
            openRatio = capacity > 0 ? totalNetMl / capacity : 0;
          } else {
            if (rawWeight <= tara) {
              displayMlOrValue = 0;
              openRatio = 0;
              stockVal = rawClosed; 
            } else {
              let netOpenMl = rawWeight - tara; 
              let totalMlGlobal = (rawClosed * capacity) + netOpenMl;

              if (totalMlGlobal >= 0) {
                stockVal = Math.floor(totalMlGlobal / capacity);
                displayMlOrValue = totalMlGlobal % capacity;
              } else {
                stockVal = 0;
                displayMlOrValue = totalMlGlobal; 
              }
              openRatio = capacity > 0 ? displayMlOrValue / capacity : 0;
            }
          }
        }
      } else {
        const currentQty = item.openBottles && item.openBottles.length > 0 
          ? Number(item.openBottles[0].value) || 0 
          : rawWeight;
        displayMlOrValue = currentQty;
        openRatio = capacity > 0 ? currentQty / capacity : (currentQty > 0 ? 1 : 0);
        stockVal = rawClosed;
      }

      const totalUnitsEquivalent = stockVal + openRatio;
      const cost = Number(item.costPrice || 0);
      const totalValue = (stockVal * cost) + (openRatio * cost);

      // Usamos el minStock personalizado del producto (por defecto 1.0 si no se especificó)
      // Usamos el minStock personalizado del producto (por defecto 1.0 si no se especificó)
      const minThreshold = Number(item.minStock) || 1.0;
      
      let isLowStock = false;
      const catLowerFull = (item.category || '').toLowerCase();
      const nameLowerFull = (item.name || '').toLowerCase();
      
      const isStrictPiece = [
        'refresco', 'agua', 'coca', 'cafe', 'cápsula', 'capsula', 'lata', 'cerveza', 'jugo', 'mix', 'bebidas', 'mezcladores'
      ].some((term) => catLowerFull.includes(term) || nameLowerFull.includes(term));

      if (isLiquorOrWine) {
        // Destilados y vinos por unidades equivalentes
        isLowStock = totalUnitsEquivalent < minThreshold;
      } else if (isStrictPiece) {
        // Mezcladores, aguas, refrescos y cápsulas se evalúan estrictamente por sus unidades cerradas (stockVal)
        isLowStock = stockVal < minThreshold;
      } else {
        // Abarrotes, frutas y jarabes por gramaje/mililitros reales
        isLowStock = displayMlOrValue < minThreshold;
      }

      return {
        ...item,
        isLiquorOrWine,
        stockVal,
        openRatio,
        displayMlOrValue,
        totalUnitsEquivalent,
        totalValue,
        isLowStock,
        method,
        capacity,
      };
    });
  }, [products]);

  const metrics = useMemo(() => {
    let totalVal = 0;
    let totalClosed = 0;
    let lowStockCount = 0;

    enrichedProducts.forEach((item) => {
      totalVal += item.totalValue;
      totalClosed += item.stockVal;
      if (item.isLowStock) lowStockCount++;
    });

    return { totalVal, totalClosed, lowStockCount };
  }, [enrichedProducts]);

  const tabProducts = useMemo(() => {
    return enrichedProducts.filter((item) => {
      const itemCategory = (item.category || '').trim().toLowerCase();
      return currentTabInfo?.categories.some((cat) =>
        itemCategory.includes(cat) || cat.includes(itemCategory)
      );
    });
  }, [enrichedProducts, currentTabInfo]);

  const availableSubtypes = useMemo(() => {
    const subs = new Set<string>();
    tabProducts.forEach((p) => {
      if (p.subtype) subs.add(p.subtype);
      else if (p.category && p.category.toLowerCase() !== activeTab) subs.add(p.category);
    });
    return Array.from(subs).sort();
  }, [tabProducts, activeTab]);

  const filteredProducts = useMemo(() => {
    return tabProducts.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubtype =
        selectedSubtypeFilter === 'ALL' ||
        item.subtype?.toLowerCase() === selectedSubtypeFilter.toLowerCase() ||
        item.category?.toLowerCase() === selectedSubtypeFilter.toLowerCase();

      const matchesLowStock = !showOnlyLowStock || item.isLowStock;

      return matchesSearch && matchesSubtype && matchesLowStock;
    });
  }, [tabProducts, searchTerm, selectedSubtypeFilter, showOnlyLowStock]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce((acc: Record<string, any[]>, product) => {
      const catName = product.category || 'Otros';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(product);
      return acc;
    }, {});
  }, [filteredProducts]);

  const groupKeys = Object.keys(groupedProducts).sort();

  const handleCopyOrderList = () => {
    const lowStockItems = enrichedProducts.filter((p) => p.isLowStock);
    if (lowStockItems.length === 0) {
      alert('¡No hay insumos con stock bajo para pedir!');
      return;
    }

    let text = `📋 *LISTA DE COMPRAS / REORDEN DE BARRA*\n`;
    text += `Fecha: ${new Date().toLocaleDateString()}\n\n`;

    lowStockItems.forEach((item, index) => {
      text += `${index + 1}. *${item.name}* (${item.category})\n`;
      text += `   - Cerradas: ${item.stockVal}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await exportInventoryToExcel();
      if (res.success && res.fileData && res.fileName) {
        const byteCharacters = atob(res.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = res.fileName;
        link.click();
      } else {
        alert('Error al generar el archivo Excel');
      }
    } catch (e) {
      console.error(e);
      alert('Error al descargar el reporte');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Cabecera Principal con el Botón de Bitácora Destacado a la Derecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoreo de Inventario</h1>
          <p className="text-sm text-slate-400">
            Vista general de existencias, valuación en tiempo real y estado actual de barra.
          </p>
        </div>

        {/* Botón de Bitácora de Turnos */}
        <Link
          href="/inventory/logs"
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 shadow-xl border border-amber-400 whitespace-nowrap self-start sm:self-auto"
        >
          📊 Ver Bitácora y Cortes por Turno
        </Link>
      </div>

      {/* Barra de Acciones Operativas */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/physical-count"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-lg"
        >
          📋 Registrar Inventario Físico
        </Link>

        <button
          onClick={handleDownloadExcel}
          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-lg cursor-pointer"
        >
          📥 Descargar Reporte Excel
        </button>

        <button
          onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
          className={`text-xs px-3.5 py-2 rounded-lg border font-semibold transition cursor-pointer whitespace-nowrap ${
            showOnlyLowStock
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/50'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          ⚠️ {showOnlyLowStock ? 'Mostrando solo Stock Bajo' : 'Filtrar Stock Bajo'}
        </button>

        <button
          onClick={handleCopyOrderList}
          className="bg-amber-600/25 hover:bg-amber-600/30 border border-amber-500/40 text-amber-400 text-xs font-semibold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          📋 {copiedNotification ? '¡Lista Copiada!' : 'Copiar Pedido de Compras'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium mb-1">Valor Total del Inventario</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ${metrics.totalVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cerrado + Proporcional Abierto</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium mb-1">Botellas / Stock Cerrado</div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {metrics.totalClosed} <span className="text-sm font-sans text-slate-400">unidades</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Existencia sellada en bodega/almacén</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium mb-1">Insumos por Reordenar</div>
          <div className={`text-2xl font-bold font-mono ${metrics.lowStockCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {metrics.lowStockCount} <span className="text-sm font-sans text-slate-400">insumos</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Por debajo del mínimo configurado</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedSubtypeFilter('ALL');
              }}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {availableSubtypes.length > 0 && (
            <select
              value={selectedSubtypeFilter}
              onChange={(e) => setSelectedSubtypeFilter(e.target.value)}
              className="w-full sm:w-52 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">
                {activeTab === 'destilados' ? '🥃 Todos los Tipos' : activeTab === 'vinos' ? '🍷 Todas las Regiones / Tipos' : '🔍 Mostrar Todos'}
              </option>
              {availableSubtypes.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          )}

          {/* BOTÓN DE PRODUCCIÓN (BATEO) - SOLO APARECE EN PREPARACIONES Y JARABES */}
          {activeTab?.toLowerCase().includes('preparaciones') && (
            <ProductionModal />
          )}

          <input
            type="text"
            placeholder="🔍 Buscar insumo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white">
            {currentTabInfo?.label} ({filteredProducts.length} insumos)
          </h2>
          {showOnlyLowStock && (
            <span className="text-xs text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Vista filtrada: Solo bajo stock
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No hay insumos que coincidan con los filtros aplicados.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 pl-6">Insumo</th>
                  <th className="py-3 px-4">Stock Cerrado</th>
                  <th className="py-3 px-4">Nivel / Estado Actual (Apertura)</th>
                  <th className="py-3 px-4 text-right pr-6">Valor Total Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {groupKeys.map((groupName) => (
                  <React.Fragment key={groupName}>
                    <tr className="bg-slate-950/60">
                      <td
                        colSpan={4}
                        className="py-2.5 px-4 pl-6 text-xs font-bold uppercase tracking-wider text-amber-400 border-t border-b border-slate-800/80 bg-slate-800/30"
                      >
                        🏷️ {groupName} ({groupedProducts[groupName].length})
                      </td>
                    </tr>

                    {groupedProducts[groupName].map((item) => {
                      const isPortionMode = item.method === 'PORTION';
                      const percentage = Math.min(100, Math.round((item.openRatio || 0) * 100));

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${
                            item.isLowStock
                              ? 'bg-rose-950/10 hover:bg-rose-950/20'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="py-3.5 px-4 pl-6">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{item.name}</span>
                              {item.subtype && (
                                <span className="bg-amber-500/10 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/20">
                                  {item.subtype}
                                </span>
                              )}
                              {item.isLowStock && (
                                <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/30">
                                  REORDEN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.isLiquorOrWine && item.tareWeight && !isPortionMode ? `Tara: ${item.tareWeight}g | ` : ''}
                              Costo: ${Number(item.costPrice || 0).toFixed(2)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                            {item.stockVal} <span className="text-xs text-slate-500 font-normal">unidades</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {item.isLiquorOrWine && item.capacity > 0 ? (
                              <div className="space-y-1">
                                <div className="text-xs font-mono">
                                  {item.displayMlOrValue < 0 ? (
                                    <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                      ⚠️ Sobregiro: {item.displayMlOrValue.toFixed(0)} ml
                                    </span>
                                  ) : isPortionMode ? (
                                    <span className="text-slate-200">{item.displayMlOrValue.toFixed(0)} ml / {item.capacity} ml ({percentage}%)</span>
                                  ) : (
                                    <span className="text-slate-200">{item.displayMlOrValue.toFixed(0)} / {item.capacity} ml ({percentage}%)</span>
                                  )}
                                </div>
                                <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      item.displayMlOrValue < 0 ? 'bg-rose-600 w-full' : percentage < 25 ? 'bg-rose-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: item.displayMlOrValue < 0 ? '100%' : `${Math.min(100, Math.max(0, percentage))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs font-mono text-slate-300">
                                {item.displayMlOrValue} {item.unit || (item.capacity === 1 ? 'pza' : 'ml')}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 pr-6 text-right font-mono text-slate-300 text-xs">
                            ${item.totalValue.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}