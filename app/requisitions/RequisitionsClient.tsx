'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface ProductItem {
  id: string;
  name: string;
  category?: string;
  subtype?: string;
  warehouseStock: number;
  stockClosed: number;
  minStock?: number;
  costPrice: number;
  capacityMl?: number;
  capacity?: number;
  tareWeight?: number;
  currentWeight?: number;
  openBottles?: any[];
  measurementMethod?: string;
}

export default function RequisitionsClient({ products = [] }: { products: ProductItem[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [requisitionCart, setRequisitionCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);

  const filteredProducts = products.filter((p) => {
    if (!searchTerm || searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term);
  });

  const handleProductNameChange = (value: string) => {
    setSelectedProductName(value);
    const prod = products.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    if (prod) {
      setSelectedProductId(prod.id);
    } else {
      setSelectedProductId('');
    }
  };

  const getProductStockText = (p: ProductItem) => {
    const catLower = (p.category || '').toLowerCase();
    const isLiquorOrWine = [
      'destilado / licor', 'destilados', 'vinos', 'licores', 'vino', 'tinto', 'blanco', 'rosado', 'espumoso', 'tequila', 'mezcal', 'ron', 'gin', 'whisky', 'vodka', 'prosecco', 'champagne'
    ].some((c) => catLower.includes(c));

    const capacity = Number(p.capacity || p.capacityMl) || 750;
    const tara = Number(p.tareWeight) || 0;
    const rawClosed = Number(p.stockClosed) || 0;
    const rawWeight = Number(p.currentWeight) || 0;
    const method = p.measurementMethod || 'SCALE';

    let stockVal = rawClosed;
    let displayMlOrValue = 0;

    if (isLiquorOrWine && capacity > 0) {
      if (method === 'PORTION') {
        const totalPortion = p.openBottles && p.openBottles.length > 0
          ? p.openBottles.reduce((acc: number, b: any) => acc + (Number(b.value) || 0), 0)
          : rawWeight;
        return `${stockVal} un. + ${totalPortion}`;
      } else {
        if (p.openBottles && p.openBottles.length > 0) {
          displayMlOrValue = p.openBottles.reduce((acc: number, b: any) => acc + Math.max(0, (Number(b.value) || 0) - tara), 0);
        } else if (rawWeight > tara) {
          displayMlOrValue = rawWeight - tara;
        }
        return `${stockVal} un. (${displayMlOrValue} ml)`;
      }
    } else {
      const currentQty = p.openBottles && p.openBottles.length > 0 
        ? Number(p.openBottles[0].value) || 0 
        : rawWeight;
      return `${stockVal > 0 ? stockVal + ' un.' : ''} ${currentQty > 0 ? currentQty + 'g/ml' : (stockVal === 0 ? '0 un.' : '')}`;
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0) return;

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const whStock = Number(prod.warehouseStock) || 0;
    if (quantity > whStock) {
      alert(`No puedes requisitar más de lo que hay en Almacén (${whStock} pzas).`);
      return;
    }

    setRequisitionCart((prev) => {
      const currentQty = prev[selectedProductId] || 0;
      const newQty = currentQty + quantity;
      return {
        ...prev,
        [selectedProductId]: Math.min(newQty, whStock),
      };
    });

    setSelectedProductName('');
    setSelectedProductId('');
    setQuantity(1);
  };

  const handleLoadBarLowStock = () => {
    const newCart: { [key: string]: number } = {};
    let count = 0;

    products.forEach((p) => {
      const barStock = Number(p.stockClosed) || 0;
      const minThreshold = Number(p.minStock) || 1.0;
      const whStock = Number(p.warehouseStock) || 0;

      if (barStock <= minThreshold && whStock > 0) {
        const suggestedQty = Math.max(1, Math.ceil(minThreshold - barStock));
        const finalQty = Math.min(suggestedQty, whStock);
        
        newCart[p.id] = finalQty;
        count++;
      }
    });

    if (count === 0) {
      alert('El inventario de barra está en orden o no hay stock disponible en almacén para surtir faltantes.');
      return;
    }

    setRequisitionCart(newCart);
    alert(`¡Se han cargado ${count} insumos faltantes de barra en la requisición!`);
  };

  const handleRemoveItem = (productId: string) => {
    setRequisitionCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleDownloadExcel = () => {
    const activeItems = Object.entries(requisitionCart).filter(([_, qty]) => qty > 0);
    if (activeItems.length === 0) {
      alert('No hay productos en la requisición para exportar.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const wsData: any[][] = [];

    wsData.push([]);
    wsData.push(['', '', 'REQUISICION DE TRASPASO ALMACEN - BARRA', '', '', '', '', '', '']);
    wsData.push([]);
    wsData.push(['DEPARTAMENTO.', 'BARRA', '', 'TRANSPASO', '', 'DESDE', 'ALMACEN (CEDIS)', '', '']);
    wsData.push(['CLAVE', 'ARTICULO', '', 'CANTIDAD', 'UNIDAD', 'ENTREGADO', 'COSTO UNIT.', 'IMPORTE TOTAL', '']);

    let grandTotal = 0;
    activeItems.forEach(([id, qty]) => {
      const prod = products.find((p) => p.id === id);
      if (!prod) return;
      const clave = (prod.category || 'BARRA').substring(0, 6).toUpperCase();
      const cost = Number(prod.costPrice) || 0;
      const subtotal = qty * cost;
      grandTotal += subtotal;

      wsData.push([
        clave,
        prod.name,
        '',
        qty,
        'pza',
        '',
        cost,
        subtotal,
        ''
      ]);
    });

    while (wsData.length < 15) {
      wsData.push(['', '', '', '', '', '', '', '', '']);
    }

    wsData.push([]);
    wsData.push(['REQUERIDO POR', 'Barra Altezza', '', 'FECHA', todayStr, 'AUTORIZADO', '', 'FECHA', '']);
    wsData.push(['RECIBIÓ', '', '', 'FECHA', '', 'ALMACÉN', '', 'FECHA', '']);

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    worksheet['!cols'] = [
      { wch: 13 },
      { wch: 22 },
      { wch: 35 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'requisicion');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Requisicion_Barra_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };

  const handleProcessRequisition = async () => {
    const itemsToSubmit = Object.entries(requisitionCart)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (itemsToSubmit.length === 0) {
      alert('Selecciona al menos un producto y cantidad para requisitar.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al surtir');

      alert(data.message);
      setRequisitionCart({});
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la requisición.');
    } finally {
      setLoading(false);
    }
  };

  const activeItemsCount = Object.entries(requisitionCart).filter(([_, qty]) => qty > 0).length;
  const totalItemsRequested = Object.values(requisitionCart).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📝 Módulo de Requisiciones / Traspasos
          </h1>
          <p className="text-sm text-slate-400">
            Solicita mercancía del Almacén (CEDIS) para abastecer los faltantes del inventario operativo de la barra.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeItemsCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              📥 Descargar Requisición (Excel)
            </button>
          )}
          <Link
            href="/warehouse"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2.5 rounded-lg transition"
          >
            🏢 Ver Almacén Central
          </Link>
          <Link
            href="/"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2.5 rounded-lg transition"
          >
            ← Menú Principal
          </Link>
        </div>
      </div>

      {/* SECCIÓN DE ADICIÓN RÁPIDA (Estilo Compras) */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            🛒 Agregar Insumos al Traspaso
          </h2>
          <button
            type="button"
            onClick={handleLoadBarLowStock}
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            📥 Cargar Faltantes de Barra (Reorden)
          </button>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-12 sm:col-span-7">
            <label className="block text-xs font-medium text-slate-400 mb-1">Buscar Insumo</label>
            <input
              list="products-requisition-list"
              type="text"
              value={selectedProductName}
              onChange={(e) => handleProductNameChange(e.target.value)}
              placeholder="Escribe o selecciona producto..."
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500"
            />
            <datalist id="products-requisition-list">
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="col-span-6 sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Pzas / Unid.</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm text-center outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedProductId}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-bold p-2.5 rounded-lg text-xs transition cursor-pointer"
            >
              + Agregar al Traspaso
            </button>
          </div>
        </div>
      </section>

      {/* DETALLE DE REQUISICIÓN A PROCESAR */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white">📋 Detalle del Traspaso a Procesar</h2>
          <div className="text-sm font-bold text-amber-400 font-mono">
            Total de piezas: {totalItemsRequested} pzas
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeItemsCount === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No has agregado productos al traspaso. Usa el buscador superior o el botón "Cargar Faltantes de Barra".
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 pl-6">Producto</th>
                  <th className="py-3 px-4 text-center">Stock en Almacén (CEDIS)</th>
                  <th className="py-3 px-4 text-center">Stock Actual en Barra</th>
                  <th className="py-3 px-4 text-center">Piezas a Requisitar</th>
                  <th className="py-3 px-4 text-center pr-6">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Object.entries(requisitionCart)
                  .filter(([_, qty]) => qty > 0)
                  .map(([id, qty]) => {
                    const prod = products.find((p) => p.id === id);
                    if (!prod) return null;
                    const whStock = Number(prod.warehouseStock) || 0;
                    const stockBarText = getProductStockText(prod);

                    return (
                      <tr key={id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 pl-6 font-medium text-white">{prod.name}</td>
                        <td className="py-3 px-4 text-center font-mono text-amber-400">{whStock} pzas</td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-300">{stockBarText}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          <input
                            type="number"
                            min="1"
                            max={whStock}
                            value={qty}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setRequisitionCart((prev) => ({
                                ...prev,
                                [id]: Math.min(newQty, whStock),
                              }));
                            }}
                            className="w-20 bg-slate-950 border border-slate-800 rounded p-1 text-center text-white text-xs outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center pr-6">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(id)}
                            className="text-rose-400 hover:text-rose-300 font-bold text-xs cursor-pointer"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

        {activeItemsCount > 0 && (
          <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleProcessRequisition}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs transition cursor-pointer uppercase tracking-wider"
            >
              {loading ? 'Procesando...' : '🚀 Surtir y Traspasar a Barra'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}