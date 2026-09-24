'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { createRequisitionOrder, confirmRequisitionOrder } from '../actions';

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

interface RequisitionItem {
  id: string; // ID del renglón (RequisitionItem) necesario para confirmar entregas
  productId: string;
  quantityRequested: number;
  quantityDelivered?: number;
  product?: { name: string; costPrice?: number };
}

interface RequisitionOrder {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  items: RequisitionItem[];
}

export default function RequisitionsClient({ 
  products = [], 
  pendingOrders = [], 
  completedOrders = [] 
}: { 
  products: ProductItem[];
  pendingOrders: RequisitionOrder[];
  completedOrders: RequisitionOrder[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'nuevo' | 'standby' | 'historial'>('nuevo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [requisitionCart, setRequisitionCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);

  // Estado para la orden en Standby que se está revisando/surtiendo
  const [activeOrderToReview, setActiveOrderToReview] = useState<RequisitionOrder | null>(null);
  const [deliveryQuantities, setDeliveryQuantities] = useState<{ [key: string]: number }>({});

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
        return `${stockVal} un.`;
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
      alert('El inventario de barra está en orden o no hay stock disponible en almacén.');
      return;
    }

    setRequisitionCart(newCart);
    alert(`¡Se han cargado ${count} insumos faltantes de barra!`);
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
    if (activeItems.length === 0) return;

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

    activeItems.forEach(([id, qty]) => {
      const prod = products.find((p) => p.id === id);
      if (!prod) return;
      const clave = (prod.category || 'BARRA').substring(0, 6).toUpperCase();
      const cost = Number(prod.costPrice) || 0;
      const subtotal = qty * cost;

      wsData.push([clave, prod.name, '', qty, 'pza', '', cost, subtotal, '']);
    });

    while (wsData.length < 15) {
      wsData.push(['', '', '', '', '', '', '', '', '']);
    }

    wsData.push([]);
    wsData.push(['REQUERIDO POR', 'Barra Altezza', '', 'FECHA', todayStr, 'AUTORIZADO', '', 'FECHA', '']);

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'requisicion');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Requisicion_Barra_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };

  // Crear Orden en Standby usando Server Action
  const handleSaveToStandby = async () => {
    const itemsToSubmit = Object.entries(requisitionCart)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantityRequested]) => ({ productId, quantityRequested }));

    if (itemsToSubmit.length === 0) {
      alert('Selecciona al menos un producto para la requisición.');
      return;
    }

    try {
      setLoading(true);
      const res = await createRequisitionOrder(itemsToSubmit);
      if (!res.success) throw new Error(res.error || 'Error al guardar requisición');

      alert('Requisición guardada en Standby correctamente.');
      setRequisitionCart({});
      setActiveTab('standby');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al procesar.');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de revisión para surtir orden en standby
  const handleOpenReviewModal = (order: RequisitionOrder) => {
    setActiveOrderToReview(order);
    const initialDelivered: { [key: string]: number } = {};
    order.items.forEach((item) => {
      initialDelivered[item.id] = item.quantityRequested;
    });
    setDeliveryQuantities(initialDelivered);
  };

  // Confirmar entrega y traspaso a barra usando Server Action
  const handleConfirmDelivery = async () => {
    if (!activeOrderToReview) return;

    try {
      setLoading(true);
      const itemsFormatted = Object.entries(deliveryQuantities).map(([itemId, quantityDelivered]) => ({
        itemId,
        quantityDelivered,
      }));

      const res = await confirmRequisitionOrder(activeOrderToReview.id, itemsFormatted);
      if (!res.success) throw new Error(res.error || 'Error al confirmar entrega');

      alert('¡Requisición surtida y stock actualizado con éxito!');
      setActiveOrderToReview(null);
      setActiveTab('historial');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al confirmar entrega.');
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
            Solicita mercancía al Almacén (CEDIS), déjala en standby y confirma entregas para control diario.
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('nuevo')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'nuevo' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          + Nueva Requisición
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('standby')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'standby' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ⏳ Órdenes en Standby
          {pendingOrders.length > 0 && (
            <span className="bg-rose-600 text-white rounded-full px-2 py-0.5 text-[10px]">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'historial' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          📊 Historial de Entradas (Movimientos)
        </button>
      </div>

      {/* PESTAÑA 1: NUEVA REQUISICIÓN */}
      {activeTab === 'nuevo' && (
        <div className="space-y-6">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                🛒 Agregar Insumos al Traspaso
              </h2>
              <button
                type="button"
                onClick={handleLoadBarLowStock}
                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
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
                  + Agregar
                </button>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">📋 Detalle de la Requisición</h2>
              <div className="flex items-center gap-3">
                {activeItemsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    📥 Descargar Excel
                  </button>
                )}
                <span className="text-sm font-bold text-amber-400 font-mono">Total: {totalItemsRequested} pzas</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeItemsCount === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No hay productos agregados en esta requisición.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 pl-6">Producto</th>
                      <th className="py-3 px-4 text-center">Stock Almacén</th>
                      <th className="py-3 px-4 text-center">Stock Barra</th>
                      <th className="py-3 px-4 text-center">Cantidad Solicitada</th>
                      <th className="py-3 px-4 text-center pr-6">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {Object.entries(requisitionCart).map(([id, qty]) => {
                      const prod = products.find((p) => p.id === id);
                      if (!prod) return null;
                      const whStock = Number(prod.warehouseStock) || 0;
                      return (
                        <tr key={id} className="hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 pl-6 font-medium text-white">{prod.name}</td>
                          <td className="py-3 px-4 text-center font-mono text-amber-400">{whStock} pzas</td>
                          <td className="py-3 px-4 text-center font-mono text-xs">{getProductStockText(prod)}</td>
                          <td className="py-3 px-4 text-center font-mono">
                            <input
                              type="number"
                              min="1"
                              max={whStock}
                              value={qty}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                setRequisitionCart((prev) => ({ ...prev, [id]: Math.min(newQty, whStock) }));
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
                  onClick={handleSaveToStandby}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs transition cursor-pointer uppercase tracking-wider"
                >
                  {loading ? 'Guardando...' : '⏳ Guardar en Standby'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA 2: ÓRDENES EN STANDBY */}
      {activeTab === 'standby' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">⏳ Requisiciones Pendientes de Surtir</h2>
          {pendingOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No hay requisiciones en standby en este momento.</div>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-xs text-amber-400 font-mono">Folio ID: {order.id.slice(-6)}</div>
                    <div className="text-sm font-bold text-white">Fecha: {new Date(order.createdAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-1">{order.items.length} productos solicitados</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenReviewModal(order)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    🔍 Revisar y Surtir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA 3: HISTORIAL DE ENTRADAS */}
      {activeTab === 'historial' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">📊 Historial de Traspasos Completados (Entradas a Barra)</h2>
          {completedOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">Aún no hay registros en el historial.</div>
          ) : (
            <div className="space-y-6">
              {completedOrders.map((order) => (
                <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono text-emerald-400">✅ Surtido el: {new Date(order.createdAt).toLocaleString()}</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded">Completado</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-2 rounded text-xs flex justify-between">
                        <span className="text-slate-200">{item.product?.name || 'Producto'}</span>
                        <span className="font-mono text-amber-400 font-bold">{item.quantityDelivered} entregadas</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL DE REVISIÓN Y CONFIRMACIÓN DE ENTREGA */}
      {activeOrderToReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Validar Entrega de Requisición</h3>
            <p className="text-xs text-slate-400">Verifica o ajusta las cantidades que realmente se entregaron desde el almacén a la barra:</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 p-3 rounded-lg bg-slate-950">
              {activeOrderToReview.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b border-slate-900">
                  <span className="text-sm text-white font-medium">{item.product?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Solicitado: {item.quantityRequested}</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryQuantities[item.id] ?? item.quantityRequested}
                      onChange={(e) => setDeliveryQuantities({
                        ...deliveryQuantities,
                        [item.id]: parseInt(e.target.value) || 0
                      })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveOrderToReview(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelivery}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold px-5 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                {loading ? 'Surtiendo...' : 'Confirmar y Traspasar a Barra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}