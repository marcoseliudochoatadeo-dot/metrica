'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { updateAllInventoryWeights, createInventoryZone, deleteInventoryZone } from '@/app/actions';

export default function PhysicalCountClient({ products = [], initialZones = [] }: { products: any[], initialZones: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState(''); // NUEVO: Estado para la etiqueta seleccionada
  
  const [zones, setZones] = useState(initialZones);
  const [showZoneConfig, setShowZoneConfig] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');

  const [counts, setCounts] = useState<Record<string, {
    measurementMethod: string;
    openValues: (number | string)[];
    locations: Record<string, number | string>;
    fallbackClosed: number | string;
  }>>(
    products.reduce((acc, p) => {
      const initialOpen = p.openBottles && p.openBottles.length > 0 
        ? p.openBottles.map((b: any) => b.value) 
        : [p.currentWeight === 0 ? "" : (p.currentWeight ?? "")];

      let savedLocations: Record<string, number | string> = {};
      if (p.lastCountMap) {
        try {
          savedLocations = typeof p.lastCountMap === 'string' ? JSON.parse(p.lastCountMap) : p.lastCountMap;
        } catch (e) { console.error(e); }
      }

      acc[p.id] = {
        measurementMethod: p.measurementMethod || 'SCALE',
        openValues: initialOpen.length > 0 ? initialOpen : [""],
        locations: savedLocations,
        fallbackClosed: (p.stockClosed === 0 || p.stockClosed == null) ? "" : p.stockClosed,
      };
      return acc;
    }, {})
  );

  // NUEVO: Extraemos todas las etiquetas (subtipos) únicas de los productos para el filtro
  const uniqueTags = useMemo(() => {
    const tags = products
      .map(p => p.subtype)
      .filter(tag => tag && tag.trim() !== '');
    return Array.from(new Set(tags)).sort();
  }, [products]);

  // NUEVO: Lógica de filtrado doble (Búsqueda por texto + Filtro por Etiqueta)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const searchLower = searchTerm.toLowerCase();
      
      // AHORA BUSCA EN NOMBRE, CATEGORÍA Y ETIQUETA (SUBTIPO)
      const matchesSearch = 
        (p.name || '').toLowerCase().includes(searchLower) ||
        (p.category || '').toLowerCase().includes(searchLower) ||
        (p.subtype || '').toLowerCase().includes(searchLower);
        
      const matchesTag = selectedTag === '' || (p.subtype || '') === selectedTag;

      return matchesSearch && matchesTag;
    });
  }, [products, searchTerm, selectedTag]);

  const handleMethodChange = (id: string, method: string) => {
    setCounts(prev => ({ ...prev, [id]: { ...prev[id], measurementMethod: method } }));
  };

  const handleOpenValueChange = (id: string, index: number, value: string | number) => {
    setCounts(prev => {
      const currentList = [...prev[id].openValues];
      currentList[index] = value;
      return { ...prev, [id]: { ...prev[id], openValues: currentList } };
    });
  };

  const handleAddBottle = (id: string) => {
    setCounts(prev => ({ ...prev, [id]: { ...prev[id], openValues: [...prev[id].openValues, ""] } }));
  };

  const handleRemoveBottle = (id: string, index: number) => {
    setCounts(prev => {
      const currentList = prev[id].openValues.filter((_, i) => i !== index);
      return { ...prev, [id]: { ...prev[id], openValues: currentList.length > 0 ? currentList : [""] } };
    });
  };

  const handleLocationChange = (id: string, zoneName: string, value: string) => {
    setCounts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        locations: {
          ...prev[id].locations,
          [zoneName]: value === "" ? "" : parseInt(value, 10),
        },
      },
    }));
  };

  const handleFallbackClosedChange = (id: string, value: string) => {
    setCounts((prev) => ({
      ...prev,
      [id]: { ...prev[id], fallbackClosed: value === "" ? "" : parseInt(value, 10) },
    }));
  };

  const handleSaveAll = () => {
    startTransition(async () => {
      try {
        const payload = products.map((product) => {
          const itemCounts = counts[product.id];
          const numericOpenValues = itemCounts.openValues.map((v: any) => v === "" ? 0 : Number(v) || 0);
          
          const catLower = (product.category || '').toLowerCase();
          const isWine = catLower.includes('vino') || catLower.includes('tinto') || catLower.includes('blanco') || catLower.includes('rosado') || catLower.includes('espumoso');

          let totalClosedUnits = 0;
          let finalMapToSave = null;

          if (isWine && zones.length > 0) {
            finalMapToSave = { ...itemCounts.locations };
            totalClosedUnits = Object.values(itemCounts.locations).reduce((acc: number, val: any) => acc + (val === "" ? 0 : Number(val)), 0);
          } else {
            totalClosedUnits = itemCounts.fallbackClosed === "" ? 0 : Number(itemCounts.fallbackClosed);
          }

          return {
            productId: product.id,
            measurementMethod: itemCounts.measurementMethod,
            openValues: numericOpenValues,
            newClosedUnits: totalClosedUnits,
            lastCountMap: finalMapToSave,
          };
        });

        const result = await updateAllInventoryWeights(payload);

        if (result && !result.success) throw new Error(result.error || 'Error al guardar');

        alert('¡Inventario físico guardado y actualizado con éxito!');
        router.refresh();
      } catch (error: any) {
        alert(`Error al guardar el inventario: ${error.message}`);
      }
    });
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    const res = await createInventoryZone(newZoneName);
    if (res.success) {
      setZones([...zones, res.data]);
      setNewZoneName('');
    } else {
      alert(res.error);
    }
  };

  const handleRemoveZone = async (id: string) => {
    if(!confirm('¿Seguro que deseas eliminar esta zona?')) return;
    const res = await deleteInventoryZone(id);
    if (res.success) {
      setZones(zones.filter(z => z.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full xl:w-auto">
          
          {/* BARRA DE BÚSQUEDA */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="🔍 Buscar insumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 placeholder-slate-500"
            />
          </div>

          {/* NUEVO: FILTRO POR ETIQUETAS (SUBTIPO) */}
          <div className="relative w-full sm:w-56">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 cursor-pointer appearance-none"
            >
              <option value="">🏷️ Todas las etiquetas</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              ▼
            </div>
          </div>

          <button 
            onClick={() => setShowZoneConfig(!showZoneConfig)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition flex items-center justify-center gap-2"
          >
            ⚙️ {showZoneConfig ? 'Ocultar Zonas' : 'Zonas Vinos'}
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-lg transition shadow-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Guardando...' : '💾 Guardar Todo el Conteo'}
        </button>
      </div>

      {showZoneConfig && (
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-inner space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-white">📍 Zonas Físicas exclusivas para Vinos</h3>
          <p className="text-xs text-slate-400">Define dónde almacenas tus vinos (ej. Cava, Refrigerador, Caja). Estas casillas aparecerán únicamente en los productos de la categoría de vinos.</p>
          
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Nombre de la zona de vinos..." 
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 w-64"
            />
            <button onClick={handleAddZone} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-4 py-2.5 rounded transition">
              + Agregar Zona
            </button>
          </div>

          {zones.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
              {zones.map(z => (
                <div key={z.id} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 flex items-center gap-2 text-xs text-slate-200">
                  <span>{z.name}</span>
                  <button onClick={() => handleRemoveZone(z.id)} className="text-rose-400 hover:text-rose-300 font-bold ml-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Insumo</th>
                <th className="py-3 px-4">Categoría / Método</th>
                <th className="py-3 px-4 text-right">Botellas Abiertas / Peso Actual</th>
                <th className="py-3 px-4 text-center">Conteo Stock Cerrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.map((product) => {
                const itemCounts = counts[product.id];
                
                const catLower = (product.category || '').toLowerCase();
                const isWine = catLower.includes('vino') || catLower.includes('tinto') || catLower.includes('blanco') || catLower.includes('rosado') || catLower.includes('espumoso');

                let currentTotalClosed = 0;
                if (isWine && zones.length > 0) {
                  currentTotalClosed = Object.values(itemCounts.locations).reduce((acc: number, val: any) => acc + (val === "" ? 0 : Number(val)), 0);
                } else {
                  currentTotalClosed = itemCounts.fallbackClosed === "" ? 0 : Number(itemCounts.fallbackClosed);
                }

                const isLow = currentTotalClosed <= 0; 
                const nameUpper = (product.name || '').toUpperCase();
                const isDirectMeasure = catLower.includes('frutas') || catLower.includes('verduras') || catLower.includes('abarrotes') || catLower.includes('preparacion') || catLower.includes('jarabe') || nameUpper.includes('[SUBRECETA]');
                const productUnit = product.unit || (product.capacity && product.capacity > 1 ? 'ml' : 'g');

                return (
                  <tr key={product.id} className="hover:bg-slate-800/40 transition align-top">
                    
                    <td className="py-3 px-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        {product.name}
                        {isLow && !isDirectMeasure && (
                          <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/30">RESURTIR</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {product.capacity ? `Capacidad unidad: ${product.capacity}${productUnit}` : ''} 
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs space-y-2">
                      <div className="text-amber-400 uppercase font-semibold">{product.category || 'General'}</div>
                      
                      {/* NUEVO: Etiqueta visual del subtipo para identificar rápidamente */}
                      {product.subtype && (
                        <div className="inline-block mt-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                          🏷️ {product.subtype}
                        </div>
                      )}

                      {!isDirectMeasure && (
                        <div className="pt-1">
                          <select
                            value={itemCounts.measurementMethod}
                            onChange={(e) => handleMethodChange(product.id, e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded px-2 py-1 outline-none focus:border-amber-500"
                          >
                            <option value="SCALE">⚖️ Báscula (Gramos)</option>
                            <option value="PORTION">👁️ A Ojo (Dec. 0.5, 1)</option>
                          </select>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right border-r border-slate-800/50">
                      {isDirectMeasure ? (
                         <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number" step="any" placeholder="Ej. 500"
                              value={itemCounts.openValues[0] ?? ""}
                              onChange={(e) => handleOpenValueChange(product.id, 0, e.target.value)}
                              className="w-32 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white text-right font-mono focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[11px] text-emerald-400 font-medium w-12 text-left">{product.unit || (product.capacity === 1 ? 'pza' : 'ml')}</span>
                          </div>
                        </div>
                      ) : (
                         <div className="flex flex-col items-end gap-2">
                          {itemCounts.openValues.map((val, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              <input
                                type="number" step={itemCounts.measurementMethod === 'PORTION' ? "0.1" : "any"}
                                placeholder={itemCounts.measurementMethod === 'PORTION' ? "Ej. 0.5" : "Ej. 750"}
                                value={val}
                                onChange={(e) => handleOpenValueChange(product.id, index, e.target.value)}
                                className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white text-right font-mono focus:outline-none focus:border-amber-500"
                              />
                              <span className="text-[10px] text-slate-500 w-14 text-left">{itemCounts.measurementMethod === 'PORTION' ? 'porción' : 'g / ml'}</span>
                              {itemCounts.openValues.length > 1 && (
                                <button type="button" onClick={() => handleRemoveBottle(product.id, index)} className="text-rose-400 bg-rose-500/10 px-1.5 py-1 rounded text-xs">✕</button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => handleAddBottle(product.id)} className="text-amber-400 text-[11px] mt-1">+ Abierta</button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        {isWine && zones.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                            {zones.map((zone) => (
                              <div key={zone.id} className="flex flex-col items-center">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">{zone.name}</span>
                                <input
                                  type="number" min="0" step="1" placeholder="-"
                                  value={itemCounts.locations[zone.name] ?? ""}
                                  onChange={(e) => handleLocationChange(product.id, zone.name, e.target.value)}
                                  className="w-12 sm:w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-1.5 text-xs text-emerald-400 text-center font-mono focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Unidades</span>
                            <input
                              type="number" min="0" step="1" placeholder="-"
                              value={itemCounts.fallbackClosed}
                              onChange={(e) => handleFallbackClosedChange(product.id, e.target.value)}
                              className="w-20 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-400 text-center font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        <div className="text-[10px] text-amber-500/80 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mt-1">
                          Total: {currentTotalClosed} pza
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}