'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ProductItem {
  id: string;
  name: string;
  category?: string;
  costPrice?: number;
  capacityMl?: number;
  warehouseStock?: number;
  warehouseMinStock?: number;
  warehouseMaxStock?: number;
  supplier?: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  category: string;
  currentStockDisplay: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  capacityMl: number;
}

interface OrderItemDB {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

interface PurchaseOrderDB {
  id: string;
  supplier: string;
  invoiceFolio: string;
  status: string;
  totalAmount: number;
  createdAt: string | Date;
  items: OrderItemDB[];
}

export default function PurchasesClient({
  products = [],
  existingSuppliers = [],
  pendingOrders = [],
}: {
  products: ProductItem[];
  existingSuppliers: string[];
  pendingOrders: PurchaseOrderDB[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'NEW' | 'PENDING'>('NEW');

  const [supplier, setSupplier] = useState('');
  const [invoiceFolio, setInvoiceFolio] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [purchaseList, setPurchaseList] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para la validación de órdenes pendientes (Recepción con palomeo)
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [receivedQuantities, setReceivedQuantities] = useState<{ [key: string]: number }>({});

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
      setUnitCost(prod.costPrice || 0);
    } else {
      setSelectedProductId('');
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0) return;

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      category: prod.category || 'ALMACÉN',
      currentStockDisplay: `${Number(prod.warehouseStock) || 0} pzas en almacén`,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      capacityMl: prod.capacityMl || 750,
    };

    setPurchaseList((prev) => {
      const index = prev.findIndex((i) => i.productId === newItem.productId);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = newItem;
        return copy;
      }
      return [...prev, newItem];
    });

    setSelectedProductName('');
    setSelectedProductId('');
    setQuantity(1);
    setUnitCost(0);
  };

  const handleLoadLowStockItems = () => {
    const lowStockItems: PurchaseItem[] = [];

    products.forEach((p) => {
      const whStock = Number(p.warehouseStock) || 0;
      const minThreshold = Number(p.warehouseMinStock) ?? 1.0;
      const maxThreshold = Number(p.warehouseMaxStock) ?? 5.0;

      const isLowStock = whStock <= minThreshold;

      if (isLowStock) {
        if (supplier && supplier.trim() !== '') {
          const prodSupplier = (p.supplier || '').trim().toLowerCase();
          if (!prodSupplier.includes(supplier.trim().toLowerCase())) return;
        }

        const suggestedQty = Math.max(1, Math.ceil(maxThreshold - whStock));

        lowStockItems.push({
          productId: p.id,
          productName: p.name,
          category: p.category || 'ALMACÉN',
          currentStockDisplay: `${whStock} pzas en almacén`,
          quantity: suggestedQty,
          unitCost: p.costPrice || 0,
          totalCost: suggestedQty * (p.costPrice || 0),
          capacityMl: p.capacityMl || 750,
        });
      }
    });

    if (lowStockItems.length === 0) {
      alert('No hay insumos en reorden de almacén bajo sus umbrales configurados.');
      return;
    }

    setPurchaseList((prev) => {
      const newMap = new Map();
      prev.forEach((item) => newMap.set(item.productId, item));
      lowStockItems.forEach((item) => {
        if (!newMap.has(item.productId)) {
          newMap.set(item.productId, item);
        }
      });
      return Array.from(newMap.values());
    });

    alert(`¡Se han cargado ${lowStockItems.length} insumos de almacén calculando su reorden óptimo!`);
  };

  const handleRemoveItem = (productId: string) => {
    setPurchaseList((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSavePurchaseOrder = async () => {
    if (purchaseList.length === 0) {
      alert('Agrega al menos un producto a la orden de compra.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier,
          invoiceFolio,
          items: purchaseList,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      alert(data.message);
      setPurchaseList([]);
      setSupplier('');
      setInvoiceFolio('');
      setActiveTab('PENDING');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la orden.');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar la recepción de una orden específica
  const handleOpenReceiveModal = (order: PurchaseOrderDB) => {
    setReceivingOrderId(order.id);
    const initialChecks: { [key: string]: boolean } = {};
    const initialQtys: { [key: string]: number } = {};
    
    order.items.forEach((item) => {
      initialChecks[item.id] = true; // Por defecto todos llegan palomeados
      initialQtys[item.id] = item.quantity;
    });

    setCheckedItems(initialChecks);
    setReceivedQuantities(initialQtys);
  };

  // Confirmar recepción de factura y cargar stock al almacén
  const handleConfirmReceiveOrder = async (order: PurchaseOrderDB) => {
    const itemsToReceive = order.items
      .filter((item) => checkedItems[item.id]) // Solo los que tienen palomita
      .map((item) => ({
        productId: item.productId,
        quantity: receivedQuantities[item.id] !== undefined ? receivedQuantities[item.id] : item.quantity,
      }));

    if (itemsToReceive.length === 0) {
      alert('Debes seleccionar al menos un producto recibido para confirmar la factura.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/purchases/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          receivedItems: itemsToReceive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al recibir');

      alert(data.message);
      setReceivingOrderId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al confirmar la recepción.');
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = purchaseList.reduce((acc, item) => acc + item.totalCost, 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📦 Módulo de Compras y Órdenes en Standby
          </h1>
          <p className="text-sm text-slate-400">
            Genera órdenes de compra y valida tus facturas físicas antes de cargar el inventario al Almacén.
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

      {/* Pestañas de Navegación */}
      <div className="flex gap-3 bg-slate-900 border border-slate-800 p-2 rounded-xl shadow-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'NEW' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          ➕ Nueva Orden de Compra
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'PENDING' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>⏳ Órdenes en Standby / Facturas Pendientes</span>
          {pendingOrders.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
              {pendingOrders.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'NEW' ? (
        /* VISTA 1: CREAR NUEVA COMPRA */
        <div className="space-y-6">
          {/* Datos Generales */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              📝 Datos de la Factura / Proveedor
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Proveedor / Distribuidor</label>
                <input
                  list="suppliers-list"
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ej. La Castellana, Checo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500"
                />
                <datalist id="suppliers-list">
                  {existingSuppliers.map((sup) => (
                    <option key={sup} value={sup} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Folio de Factura / Remisión</label>
                <input
                  type="text"
                  value={invoiceFolio}
                  onChange={(e) => setInvoiceFolio(e.target.value)}
                  placeholder="Ej. F-10492"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </section>

          {/* Adición de Insumos */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                🛒 Agregar Insumos a la Nota
              </h2>
              <button
                type="button"
                onClick={handleLoadLowStockItems}
                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                📥 Cargar Insumos en Reorden de Almacén
              </button>
            </div>

            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 sm:col-span-6">
                <label className="block text-xs font-medium text-slate-400 mb-1">Buscar Insumo</label>
                <input
                  list="products-purchase-list"
                  type="text"
                  value={selectedProductName}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  placeholder="Escribe o selecciona producto..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500"
                />
                <datalist id="products-purchase-list">
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div className="col-span-4 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Piezas</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm text-center outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Costo Unitario ($)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-sm text-center outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
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

          {/* Detalle de la Compra */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">📋 Detalle de la Compra en Standby</h2>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                Total: ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="overflow-x-auto">
              {purchaseList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No hay insumos agregados a esta orden. Usa el buscador o carga los faltantes de almacén.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 pl-6">Producto</th>
                      <th className="py-3 px-4 text-center">Stock Actual (CEDIS)</th>
                      <th className="py-3 px-4 text-center">Piezas a Comprar</th>
                      <th className="py-3 px-4 text-right">Costo Unit.</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-center pr-6">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {purchaseList.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 pl-6 font-medium text-white">{item.productName}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">{item.currentStockDisplay}</td>
<td className="py-3 px-4 text-center font-mono">
  <input
    type="number"
    min="1"
    value={item.quantity}
    onChange={(e) => {
      const newQty = parseInt(e.target.value) || 1;
      setPurchaseList((prev) =>
        prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: newQty, totalCost: newQty * i.unitCost }
            : i
        )
      );
    }}
    className="w-20 bg-slate-950 border border-slate-800 rounded p-1 text-center text-amber-400 text-xs font-bold outline-none focus:border-amber-500"
  />
</td>                        <td className="py-3 px-4 text-right font-mono">${item.unitCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">${item.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-center pr-6">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-rose-400 hover:text-rose-300 font-bold text-xs cursor-pointer"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {purchaseList.length > 0 && (
              <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSavePurchaseOrder}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs transition cursor-pointer uppercase tracking-wider shadow"
                >
                  {loading ? 'Guardando...' : '📥 Guardar Orden en Standby'}
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* VISTA 2: ÓRDENES PENDIENTES / RECEPCIÓN DE FACTURAS */
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-800/40 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">⏳ Órdenes de Compra Pendientes de Recepción (Standby)</h2>
            <p className="text-xs text-slate-400">Compara tu factura física, palomea lo que llegó, ajusta faltantes por desabasto y confirma para inyectar al Almacén.</p>
          </div>

          <div className="p-6">
            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay órdenes de compra en standby en este momento.
              </div>
            ) : (
              <div className="space-y-6">
                {pendingOrders.map((order) => {
                  const isReceiving = receivingOrderId === order.id;
                  const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', {
                    dateStyle: 'medium',
                  });

                  return (
                    <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>🏢 Proveedor: {order.supplier || 'General'}</span>
                            <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                              Folio: {order.invoiceFolio}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Fecha de orden: {dateStr}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-sm font-bold text-emerald-400 font-mono">
                            Total: ${order.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                          {!isReceiving ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiveModal(order)}
                              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer shadow"
                            >
                              📋 Revisar y Recibir Factura
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReceivingOrderId(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-lg text-xs transition"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista de productos de la orden */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                            <tr>
                              {isReceiving && <th className="py-2.5 px-3 text-center w-12">Recibido</th>}
                              <th className="py-2.5 px-3 pl-4">Producto</th>
                              <th className="py-2.5 px-3 text-center">Cantidad Pedida</th>
                              {isReceiving && <th className="py-2.5 px-3 text-center">Cantidad Real (Factura)</th>}
                              <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                              <th className="py-2.5 px-3 text-right pr-4">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {order.items.map((item) => {
                              const isChecked = checkedItems[item.id] ?? true;
                              const currentQty = receivedQuantities[item.id] ?? item.quantity;

                              return (
                                <tr key={item.id} className={`hover:bg-slate-900/30 transition ${!isChecked && isReceiving ? 'opacity-40 line-through' : ''}`}>
                                  {isReceiving && (
                                    <td className="py-2.5 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          setCheckedItems((prev) => ({
                                            ...prev,
                                            [item.id]: e.target.checked,
                                          }));
                                        }}
                                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                      />
                                    </td>
                                  )}
                                  <td className="py-2.5 px-3 pl-4 font-medium text-white">{item.productName}</td>
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{item.quantity} pzas</td>
                                  
                                  {isReceiving && (
                                    <td className="py-2.5 px-3 text-center font-mono">
                                      <input
                                        type="number"
                                        min="0"
                                        disabled={!isChecked}
                                        value={currentQty}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          setReceivedQuantities((prev) => ({
                                            ...prev,
                                            [item.id]: val,
                                          }));
                                        }}
                                        className="w-20 bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs font-bold outline-none focus:border-amber-500 disabled:opacity-50"
                                      />
                                    </td>
                                  )}

                                  <td className="py-2.5 px-3 text-right font-mono">${item.unitCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-2.5 px-3 text-right pr-4 font-mono text-emerald-400 font-bold">${item.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Botón de confirmación si está en modo recepción */}
                      {isReceiving && (
                        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleConfirmReceiveOrder(order)}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer uppercase tracking-wider shadow"
                          >
                            {loading ? 'Procesando...' : '🚀 Confirmar Recepción y Cargar al Almacén'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}