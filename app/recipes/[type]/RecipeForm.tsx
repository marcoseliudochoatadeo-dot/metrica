'use client';

import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { useSearchParams, useRouter } from 'next/navigation';
import { createRecipe, updateRecipe } from '@/app/recipe-actions';

interface Product {
  id: string;
  name: string;
  category?: string;
  unit?: string;
}

interface IngredientRow {
  productId: string;
  quantity: string;
  unit: string;
}

interface RecipeFormProps {
  upperType: string;
  supplies: Product[];
  recipeToEdit?: any;
}

export default function RecipeForm({ upperType, supplies, recipeToEdit }: RecipeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [isMounted, setIsMounted] = useState(false);

  const [name, setName] = useState('');
  const [salePrice, setSalePrice] = useState<any>(upperType.includes('SUB') ? 0 : 180);
  const [description, setDescription] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState<any>(750);
  const [yieldUnit, setYieldUnit] = useState<string>('ml');
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { productId: '', quantity: '', unit: 'ml' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (recipeToEdit) {
      setName(recipeToEdit.name || '');
      setSalePrice(recipeToEdit.price || recipeToEdit.salePrice || 0);
      setDescription(recipeToEdit.description || '');
      setYieldQuantity(recipeToEdit.yieldQuantity || 750);
      setYieldUnit(recipeToEdit.yieldUnit || 'ml');
      setImageUrl(recipeToEdit.imageUrl || '');
      if (recipeToEdit.items && recipeToEdit.items.length > 0) {
        setIngredients(
          recipeToEdit.items.map((i: any) => ({
            productId: i.productId,
            quantity: String(i.quantity),
            unit: i.unit || 'ml',
          }))
        );
      }
    } else {
      setName('');
      setSalePrice(upperType.includes('SUB') ? 0 : 180);
      setDescription('');
      setYieldQuantity(750);
      setYieldUnit('ml');
      setImageUrl('');
      setIngredients([{ productId: '', quantity: '', unit: 'ml' }]);
    }
  }, [recipeToEdit, editId]);

  if (!isMounted) {
    return (
      <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 h-fit">
        <h2 className="text-lg font-semibold mb-4 text-slate-200">Cargando formulario...</h2>
      </section>
    );
  }

  const supplyOptions = supplies.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.category || 'Sin Cat'})`,
    category: s.category || '',
    unit: s.unit || 'ml',
  }));

  const addIngredientField = () => {
    setIngredients((prev) => [...prev, { productId: '', quantity: '', unit: 'ml' }]);
  };

  const removeIngredientField = (indexToRemove: number) => {
    if (ingredients.length === 1) return;
    setIngredients((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSelectProduct = (index: number, selectedOption: any) => {
    setIngredients((prev) => {
      const updated = [...prev];
      const productId = selectedOption ? selectedOption.value : '';
      let defaultUnit = selectedOption ? selectedOption.unit : 'ml';

      if (selectedOption) {
        const cat = selectedOption.category.toLowerCase();
        if (cat.includes('fruta') || cat.includes('garnish') || cat.includes('seco')) {
          defaultUnit = 'gr';
        }
      }

      updated[index] = {
        ...updated[index],
        productId,
        unit: defaultUnit,
      };
      return updated;
    });
  };

  const handleQuantityOrUnitChange = (
    index: number,
    field: 'quantity' | 'unit',
    value: string
  ) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        setImageUrl(compressedBase64);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set('imageUrl', imageUrl);

    try {
      let result;
      if (recipeToEdit) {
        result = await updateRecipe(recipeToEdit.id, formData);
      } else {
        result = await createRecipe(formData);
      }

      if (result?.success) {
        if (recipeToEdit) {
          router.push(window.location.pathname);
        }
        formRef.current?.reset();
        setImageUrl('');
        setIngredients([{ productId: '', quantity: '', unit: 'ml' }]);
      } else {
        alert(`Error al guardar: ${result?.error || 'Revisa la consola'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Ocurrió un error al enviar el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      color: '#ffffff',
      fontSize: '0.75rem',
      minHeight: '34px',
      borderRadius: '0.375rem',
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      zIndex: 50,
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#334155' : '#0f172a',
      color: state.isFocused ? '#f59e0b' : '#cbd5e1',
      fontSize: '0.75rem',
      cursor: 'pointer',
    }),
    singleValue: (base: any) => ({ ...base, color: '#ffffff' }),
    input: (base: any) => ({ ...base, color: '#ffffff' }),
  };

  return (
    <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 h-fit">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-200">
          {recipeToEdit ? `Editando: ${recipeToEdit.name}` : 'Agregar Nueva Receta'}
        </h2>
        {recipeToEdit && (
          <button
            type="button"
            onClick={() => router.push(window.location.pathname)}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            Cancelar Edición
          </button>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="type" value={upperType} />

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Nombre del Cóctel / Preparación
          </label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ej. Smoked Negroni, Cordial de Maracuyá"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Fotografía del Cóctel
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg transition font-medium">
              📷 Subir Imagen
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {imageUrl && <span className="text-xs text-emerald-400 font-mono">✓ Imagen cargada</span>}
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-700" />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Precio de Venta al Público ($ MXN)
          </label>
          <input
            type="number"
            step="0.01"
            name="salePrice"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Descripción / Método de Preparación
          </label>
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cristalería, método de elaboración y garnish..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none resize-none"
          />
        </div>

        {/* RENDIMIENTO / CANTIDAD RESULTANTE */}
        <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
          <div>
            <label className="block text-xs font-medium text-amber-400 mb-1">
              Rendimiento (Cantidad)
            </label>
            <input
              type="number"
              step="0.1"
              name="yieldQuantity"
              value={yieldQuantity}
              onChange={(e) => setYieldQuantity(e.target.value)}
              placeholder="Ej. 750"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-400 mb-1">
              Unidad de Rendimiento
            </label>
            <select
              name="yieldUnit"
              value={yieldUnit}
              onChange={(e) => setYieldUnit(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-amber-400 font-semibold outline-none"
            >
              <option value="ml">ml</option>
              <option value="lt">lt</option>
              <option value="gr">gr</option>
              <option value="kg">kg</option>
              <option value="pza">pza</option>
            </select>
          </div>
        </div>

        {/* INSUMOS CON BÚSQUEDA Y UNIDAD */}
        <div className="border-t border-slate-700 pt-3 space-y-2">
          <label className="block text-xs font-semibold text-amber-400">
            Insumos de la Receta
          </label>

          {ingredients.map((item, index) => {
            const selectedOption = supplyOptions.find((opt) => opt.value === item.productId) || null;

            return (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input type="hidden" name="productId" value={item.productId} />

                <div className="col-span-5">
                  <Select
                    options={supplyOptions}
                    value={selectedOption}
                    onChange={(opt) => handleSelectProduct(index, opt)}
                    placeholder="Buscar insumo..."
                    styles={customSelectStyles}
                    isSearchable
                    noOptionsMessage={() => 'Sin resultados'}
                  />
                </div>

                <input
                  type="number"
                  step="0.1"
                  name="quantity"
                  value={item.quantity}
                  onChange={(e) => handleQuantityOrUnitChange(index, 'quantity', e.target.value)}
                  placeholder="Cant."
                  className="col-span-3 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none h-[34px]"
                />

                <select
                  name="unit"
                  value={item.unit}
                  onChange={(e) => handleQuantityOrUnitChange(index, 'unit', e.target.value)}
                  className="col-span-3 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-amber-400 font-semibold outline-none h-[34px]"
                >
                  <option value="ml">ml</option>
                  <option value="oz">oz</option>
                  <option value="gr">gr</option>
                  <option value="pza">pza</option>
                  <option value="dash">dash</option>
                  <option value="gotas">gotas</option>
                </select>

                {ingredients.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeIngredientField(index)}
                    className="col-span-1 text-slate-500 hover:text-rose-400 text-xs font-bold text-center cursor-pointer"
                  >
                    ✕
                  </button>
                ) : (
                  <div className="col-span-1" />
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addIngredientField}
            className="w-full bg-slate-900 hover:bg-slate-700 border border-dashed border-amber-500/50 text-amber-400 text-xs font-semibold py-2 rounded-lg transition mt-2 flex items-center justify-center gap-1 cursor-pointer"
          >
            + Agregar Insumo
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer mt-2"
        >
          {isSubmitting ? 'Guardando...' : recipeToEdit ? 'Actualizar Receta' : 'Guardar Receta'}
        </button>
      </form>
    </section>
  );
}