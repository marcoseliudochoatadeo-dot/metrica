'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSale } from '@/app/actions';

interface ProductItem {
  id: string;
  name: string;
  category?: string;
  capacity?: number;
  capacityMl?: number;
  currentWeight?: number;
  stockClosed?: number;
  closedUnits?: number;
  tareWeight?: number;
  supplier?: string;
}

interface TicketSale {
  id: string;
  originalId: string;
  name: string;
  qty: number;
  type: 'RECIPE' | 'PRODUCT';
  saleMode: 'COPEO' | 'BOTELLA' | 'RECETA' | 'PIEZA' | string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

const EXCLUDED_KEYWORDS = [
  'AZUCAR', 'AZÚCAR', 'JARABE', 'JUGO', 'LIMON', 'LIMÓN',
  'FRUTA', 'SAL', 'HIELO', 'INSUMO', 'PREPARADO', 'GARNISH', 'BITTER'
];

export default function SalesAuditClient({
  recipes = [],
  products = [],
  existingSuppliers = [],
}: {
  recipes: any[];
  products: ProductItem[];
  logs?: any[];
  pendingSales?: any[];
  existingSuppliers?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any | null>(null);
  const [saleMode, setSaleMode] = useState<'COPEO' | 'BOTELLA'>('COPEO');
  const [quantity, setQuantity] = useState<number>(1);
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sellableProducts = products.filter((p) => {
    const nameUpper = (p.name || '').toUpperCase();
    const catUpper = (p.category || '').toUpperCase();
    const matchesKeyword = !EXCLUDED_KEYWORDS.some((kw) => nameUpper.includes(kw) || catUpper.includes(kw));
    
    if (!selectedSupplier || selectedSupplier.trim() === '') return matchesKeyword;

    const productSupplier = (p.supplier || '').trim().toLowerCase();
    const filterSupplier = selectedSupplier.trim().toLowerCase();

    return matchesKeyword && productSupplier.includes(filterSupplier);
  });

  const allOptions = [
    ...(!selectedSupplier || selectedSupplier.trim() === '' ? recipes.map((r) => ({
      key: `recipe_${r.id}`,
      originalId: r.id,
      label: `🍹 [Cóctel] ${r.name}`,
      type: 'RECIPE' as const,
      data: r,
    })) : []),
    ...sellableProducts.map((p) => ({
      key: `product_${p.id}`,
      originalId: p.id,
      label: `🍾 ${p.name} ${p.supplier ? `[${p.supplier}]` : ''}`,
      type: 'PRODUCT' as const,
      data: p,
    })),
  ];

  const searchResults = allOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // === LÓGICA DE VISIBILIDAD DE BOTONES POR ETIQUETAS/CATEGORÍAS ===
  const isRecipe = selectedOption?.type === 'RECIPE';
  const optCatLower = (selectedOption?.data?.category || '').toLowerCase();
  
  // Evaluamos directamente por tu sistema de categorías/etiquetas
  const isStrictPiece = [
    'mezclador', 'mezcladores', 'refresco', 'agua', 'cerveza', 'cafe', 'café', 'pieza',
    'mocktail', 'mixologia', 'mixología', 'cocteleria', 'coctelería'
  ].some(cat => optCatLower.includes(cat));
  
  // Mostrar botones solo si NO hay nada seleccionado o si lo seleccionado NO es receta y NO es pieza estricta
  const showModeToggle = !selectedOption || (!isRecipe && !isStrictPiece);

  const handleAddSale = () => {
    if (!selectedOption || quantity <= 0) return;

    let saleItems: Array<{ productId: string; productName: string; quantity: number }> = [];
    let finalSaleMode = 'RECETA';
    let displayLabel = selectedOption.label;

    if (selectedOption.type === 'RECIPE') {
      finalSaleMode = 'RECETA';
      const rawItems = selectedOption.data.ingredients || selectedOption.data.items || [];
      saleItems = rawItems.map((ing: any) => ({
        productId: ing.productId || ing.product?.id,
        productName: ing.product?.name || 'Insumo',
        quantity: ing.quantity || 0,
      }));
    } else {
      const prodData = selectedOption.data;
      const cat = (prodData.category || '').toLowerCase();
      const isWine = cat.includes('vino');
      
      // Aseguramos que la etiqueta la busque correctamente en la categoría
      const isBeerOrSoda = [
        'mezclador', 'mezcladores', 'refresco', 'agua', 'cerveza', 'cafe', 'café', 'pieza'
      ].some(term => cat.includes(term));

      const capacityVal = prodData.capacity || prodData.capacityMl || 750;

      if (isBeerOrSoda) {
        displayLabel = `🍺 [Pieza/Lata] ${prodData.name}`;
        finalSaleMode = 'PIEZA';
      } else if (saleMode === 'BOTELLA') {
        displayLabel = `🍾 [Botella ${capacityVal}ml] ${prodData.name}`;
        finalSaleMode = 'BOTELLA';
      } else {
        displayLabel = `🥃 [${isWine ? 'Copa 150ml' : 'Copeo 45ml'}] ${prodData.name}`;
        finalSaleMode = 'COPEO';
      }

      saleItems = [
        {
          productId: prodData.id,
          productName: prodData.name,
          quantity: quantity, 
        },
      ];
    }

    setTicketSales((prev) => [
      ...prev,
      {
        id: `${selectedOption.key}_${Date.now()}`,
        originalId: selectedOption.originalId,
        name: displayLabel,
        qty: quantity,
        type: selectedOption.type,
        saleMode: finalSaleMode,
        items: saleItems,
      },
    ]);

    setSelectedOption(null);
    setSearchTerm('');
    setQuantity(1);
    setIsOpen(false);
  };

  const handleRemoveSale = (index: number) => {
    setTicketSales((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommitSales = () => {
    if (ticketSales.length === 0) {
      alert('No hay ventas registradas en el ticket.');
      return;
    }

    startTransition(async () => {
      try {
        for (const sale of ticketSales) {
          await createSale(sale.type, sale.originalId, sale.qty, sale.saleMode, 0);
        }

        alert('¡Venta cobrada y stock descontado del inventario exitosamente!');
        setTicketSales([]);
        router.refresh();
      } catch (error: any) {
        alert(`Error al procesar la venta: ${error.message || 'Error desconocido'}`);
      }
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-5">
        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
          🛒 Punto de Venta / Pedidos por Proveedor
        </h2>

        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            📄 Filtrar o Buscar por Proveedor / Distribuidora
          </label>
          <input
            type="text"
            list="pos-suppliers-list"
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              setSelectedOption(null);
              setSearchTerm('');
            }}
            placeholder="Escribe o selecciona un proveedor para filtrar los insumos..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-amber-400 font-semibold outline-none focus:border-amber-500 placeholder-slate-600"
          />
          <datalist id="pos-suppliers-list">
            {existingSuppliers.map((sup) => (
              <option key={sup} value={sup} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 sm:col-span-5 relative" ref={dropdownRef}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedOption(null);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={!selectedSupplier ? "Buscar producto o cóctel..." : `Insumos de: ${selectedSupplier}...`}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-sm outline-none focus:border-amber-500 placeholder-slate-500"
            />

            {isOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-50 divide-y divide-slate-900">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    {!selectedSupplier 
                      ? 'Sin resultados.' 
                      : `No hay insumos registrados para "${selectedSupplier}".`}
                  </div>
                ) : (
                  searchResults.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedOption(opt);
                        setSearchTerm(opt.label);
                        setIsOpen(false);
                      }}
                      className="w-full text-left p-3 text-xs text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 transition cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="col-span-6 sm:col-span-3 min-h-[46px]">
            {showModeToggle && (
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 h-full">
                <button
                  type="button"
                  onClick={() => setSaleMode('COPEO')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                    saleMode === 'COPEO'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🥃 Copa/Copeo
                </button>
                <button
                  type="button"
                  onClick={() => setSaleMode('BOTELLA')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                    saleMode === 'BOTELLA'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🍾 Botella/Pza
                </button>
              </div>
            )}
          </div>

          <div className="col-span-3 sm:col-span-2 min-h-[46px]">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Cant."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 text-center h-full"
            />
          </div>

          <button
            type="button"
            onClick={handleAddSale}
            disabled={!selectedOption}
            className="col-span-3 sm:col-span-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold p-3 rounded-lg text-xs transition cursor-pointer min-h-[46px]"
          >
            + Agregar
          </button>
        </div>

        {ticketSales.length > 0 && (
          <div className="border-t border-slate-800 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Productos en el ticket de cobro:
              </h3>
              <button
                type="button"
                onClick={handleCommitSales}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Procesando...' : '💰 Cobrar y Descontar al Inventario'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {ticketSales.map((item, idx) => (
                <span
                  key={idx}
                  className="bg-slate-800 text-slate-200 text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-3 shadow"
                >
                  <span><strong>{item.qty}x</strong> {item.name}</span>
                  <button
                    onClick={() => handleRemoveSale(idx)}
                    className="text-rose-400 hover:text-rose-300 font-bold text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}