'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importProductsFromExcel } from '@/app/actions';

export default function ImportExcelModal() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const res = await importProductsFromExcel(formData);
      if (res.success) {
        alert(`¡Se importaron ${res.count} productos exitosamente!`);
        setFile(null);
        router.refresh();
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
        📊 Importación Masiva de Insumos (Excel)
      </h3>
      <p className="text-xs text-slate-400">
        Sube un archivo `.xlsx` con columnas como: <code className="text-slate-200">Nombre</code>, <code className="text-slate-200">Categoria</code>, <code className="text-slate-200">Proveedor</code>, <code className="text-slate-200">Costo</code>, <code className="text-slate-200">Capacidad</code> y <code className="text-slate-200">Unidad</code>.
      </p>

      <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer bg-slate-950 border border-slate-800 rounded-lg p-2"
        />

        <button
          type="submit"
          disabled={!file || isPending}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition whitespace-nowrap cursor-pointer"
        >
          {isPending ? 'Procesando...' : '📥 Subir e Importar'}
        </button>
      </form>
    </div>
  );
}