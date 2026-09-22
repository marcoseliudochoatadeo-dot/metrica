'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/app/actions';

interface SupplyFormProps {
  productToEdit?: any;
  onSuccess?: () => void;
  existingSuppliers?: string[];
}

const CATEGORIES = [
  { label: '🍾 Destilado / Licor', value: 'Destilado / Licor', needsTare: true },
  { label: '🍷 Vino', value: 'Vino', needsTare: true },
  { label: '🍋 Frutas / Verduras', value: 'Frutas / Verduras', needsTare: false },
  { label: '🍯 Preparaciones / Jarabes', value: 'Preparaciones / Jarabes', needsTare: false },
  { label: '📦 Abarrotes', value: 'Abarrotes', needsTare: false },
  { label: '🥤 Mezcladores', value: 'Mezcladores', needsTare: false },
];

const SPIRIT_TYPES = [
  'Tequila',
  'Mezcal',
  'Ron',
  'Whisky / Whiskey',
  'Ginebra',
  'Vodka',
  'Brandy / Cognac',
  'Licor / Cremas',
  'Otro Destilado',
];

const WINE_COUNTRIES = [
  { label: '🇲🇽 México ', value: 'México' },
  { label: '🇫🇷 Francia ', value: 'Francia' },
  { label: '🇮🇹 Italia ', value: 'Italia' },
  { label: '🇪🇸 España ', value: 'España' },
  { label: '🇦🇷 Argentina ', value: 'Argentina' },
  { label: '🇨🇱 Chile ', value: 'Chile' },
  { label: '🇺🇸 Estados Unidos ', value: 'EE. UU.' },
  { label: '🌍 Otro País / Región', value: 'Otro' },
];

const WINE_TYPES = [
  'Vino Tinto',
  'Vino Blanco',
  'Vino Rosado',
  'Vino Espumoso / Prosecco',
  'Vino Generoso / Vermut',
];

const UNITS = [
  { label: 'gr', value: 'g' },
  { label: 'ml', value: 'ml' },
  { label: 'kg', value: 'kg' },
  { label: 'lt', value: 'lt' },
  { label: 'pz', value: 'pz' },
];

export default function SupplyForm({ productToEdit, onSuccess, existingSuppliers = [] }: SupplyFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: productToEdit?.name || '',
    category: productToEdit?.category || 'Destilado / Licor',
    subtype: productToEdit?.subtype || '',
    capacity: productToEdit?.capacity ?? '',
    tareWeight: productToEdit?.tareWeight ?? '',
    costPrice: productToEdit?.costPrice ?? '',
    salePrice: productToEdit?.salePrice ?? '',
    glassPrice: productToEdit?.glassPrice ?? '',
    minStock: productToEdit?.minStock ?? '',
    maxStock: productToEdit?.maxStock ?? '',
    unit: productToEdit?.unit || 'ml',
    supplier: productToEdit?.supplier || '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        category: productToEdit.category || 'Destilado / Licor',
        subtype: productToEdit.subtype || '',
        capacity: productToEdit.capacity ?? '',
        tareWeight: productToEdit.tareWeight ?? '',
        costPrice: productToEdit.costPrice ?? '',
        salePrice: productToEdit.salePrice ?? '',
        glassPrice: productToEdit.glassPrice ?? '',
        minStock: productToEdit.minStock ?? 1,
        maxStock: productToEdit.maxStock ?? 10,
        unit: productToEdit.unit || 'ml',
        supplier: productToEdit.supplier || '',
      });
    }
  }, [productToEdit]);

  const selectedCat = CATEGORIES.find((c) => c.value === formData.category);
  const showTare = selectedCat ? selectedCat.needsTare : false;
  
  const catLower = (formData.category || '').toLowerCase();
  const isDestilado = catLower.includes('destilado') || catLower.includes('licor');
  const isVino = catLower.includes('vino');
  
  const showPrices = isDestilado || isVino;

  const currentWineCountry = isVino ? formData.subtype.split(' - ')[0] || '' : '';
  const currentWineType = isVino ? formData.subtype.split(' - ')[1] || '' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      capacity: Number(formData.capacity) || 0,
      tareWeight: showTare ? Number(formData.tareWeight) || 0 : 0,
      costPrice: Number(formData.costPrice) || 0,
      salePrice: showPrices ? Number(formData.salePrice) || 0 : 0,
      glassPrice: showPrices ? Number(formData.glassPrice) || 0 : 0,
      minStock: Number(formData.minStock) || 1,
      maxStock: Number(formData.maxStock) || 10,
      subtype: isDestilado || isVino ? formData.subtype : '',
    };

    let res;
    if (productToEdit) {
      res = await updateProduct(productToEdit.id, payload);
    } else {
      res = await createProduct(payload);
    }

    setLoading(false);

    if (res?.success) {
      router.refresh();

      if (!productToEdit) {
        setFormData({
          name: '',
          category: 'Destilado / Licor',
          subtype: '',
          capacity: '',
          tareWeight: '',
          costPrice: '',
          salePrice: '',
          glassPrice: '',
          minStock: '',
          maxStock: '',
          unit: 'ml',
          supplier: '',
        });
      }

      if (onSuccess) onSuccess();
    } else {
      alert(`Error al guardar: ${res?.error || 'No se pudo guardar el producto'}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white space-y-5">
      <h2 className="text-xl font-bold">{productToEdit ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>

      {/* Nombre del Insumo */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Nombre del Insumo</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          placeholder="ej. Azúcar"
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Insumo</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  category: cat.value,
                  subtype: cat.value !== 'Destilado / Licor' && cat.value !== 'Vino' ? '' : formData.subtype,
                })
              }
              className={`py-2 px-3 text-sm rounded-lg border text-left transition cursor-pointer ${
                formData.category === cat.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                  : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTIPO DE DESTILADO */}
      {isDestilado && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-2 animate-fadeIn">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
            🥃 Clasificación del Destilado (Tequila, Mezcal, etc.)
          </label>
          <select
            value={formData.subtype}
            onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            <option value="">Selecciona el tipo de destilado...</option>
            {SPIRIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SECCIÓN DINÁMICA DE VINOS */}
      {isVino && (
        <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-4 space-y-4 animate-fadeIn">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
            🍷 Clasificación del Vino (Región y Tipo)
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">País / Región</label>
              <select
                value={currentWineCountry}
                onChange={(e) => {
                  const country = e.target.value;
                  const type = currentWineType;
                  setFormData({ ...formData, subtype: type ? `${country} - ${type}` : country });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              >
                <option value="">Selecciona región...</option>
                {WINE_COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de Vino</label>
              <select
                value={currentWineType}
                onChange={(e) => {
                  const type = e.target.value;
                  const country = currentWineCountry;
                  setFormData({ ...formData, subtype: country ? `${country} - ${type}` : type });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              >
                <option value="">Selecciona tipo...</option>
                {WINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN DE PROVEEDOR */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <span>📄</span> Datos del Proveedor y Distribuidor
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Proveedor / Distribuidora (Selecciona o escribe)
          </label>
          <input
            type="text"
            list="suppliers-options"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            placeholder="Ej. La Castellana, Checo, Comercializadora..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-amber-500 placeholder-slate-600"
          />
          <datalist id="suppliers-options">
            {existingSuppliers.map((sup) => (
              <option key={sup} value={sup} />
            ))}
          </datalist>
        </div>
      </div>

      {/* CAMPOS DE MÍNIMO Y MÁXIMO (AQUÍ ESTABA FALTANDO INCLUIRLOS EN EL ENVÍO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            ⚠️ Stock Mínimo (Alerta de Reorden)
          </label>
          <input
            type="number"
            step="any"
            required
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
            placeholder="ej. 5"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-rose-400 font-semibold focus:outline-none focus:border-amber-500 placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            📦 Stock Máximo (Tope de Almacén)
          </label>
          <input
            type="number"
            step="any"
            required
            value={formData.maxStock}
            onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
            placeholder="ej. 20"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-emerald-400 font-semibold focus:outline-none focus:border-amber-500 placeholder-slate-600"
          />
        </div>
      </div>

      {/* Campos de Medida, Unidad y Tara / Costo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Capacidad / Cantidad</label>
          <input
            type="number"
            step="any"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="ej. 750"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Unidad de Medida</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {showTare ? (
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Tara Recipiente (g)</label>
            <input
              type="number"
              step="any"
              value={formData.tareWeight}
              onChange={(e) => setFormData({ ...formData, tareWeight: e.target.value })}
              placeholder="ej. 450"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Costo Compra ($)</label>
            <input
              type="number"
              step="any"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="ej. 150.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
            />
          </div>
        )}
      </div>

      {showTare && (
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Costo Compra ($)</label>
          <input
            type="number"
            step="any"
            value={formData.costPrice}
            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            placeholder="ej. 450.00"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
          />
        </div>
      )}

      {showPrices && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 animate-fadeIn">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Precio Botella ($)</label>
            <input
              type="number"
              step="any"
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
              placeholder="ej. 950.00"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-emerald-400 font-semibold focus:outline-none focus:border-amber-500 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Precio Copeo / Trago ($)</label>
            <input
              type="number"
              step="any"
              value={formData.glassPrice}
              onChange={(e) => setFormData({ ...formData, glassPrice: e.target.value })}
              placeholder="ej. 120.00"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-amber-400 font-semibold focus:outline-none focus:border-amber-500 placeholder-slate-600"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-3 rounded-lg transition disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Guardando...' : productToEdit ? 'Actualizar Insumo' : 'Registrar Insumo'}
      </button>
    </form>
  );
}