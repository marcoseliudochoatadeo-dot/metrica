import React from 'react';
import Link from 'next/link';
import { getProducts, getInventoryLogs, getPendingSales } from '@/app/actions';
import MermasClient from './MermasClient';

export const dynamic = 'force-dynamic';

export default async function MermasPage() {
  const [productsRes, logsRes, pendingSalesRes] = await Promise.all([
    getProducts(),
    getInventoryLogs(),
    getPendingSales(),
  ]);

  const products = productsRes?.data || productsRes || [];
  const logs = logsRes?.data || [];
  const pendingSales = pendingSalesRes?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">⚖️ Control de Mermas y Auditoría de Barra</h1>
          <p className="text-sm text-slate-400">
            Comparativa en tiempo real entre el consumo teórico (POS) y el consumo real medido en báscula.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg transition"
          >
            ← Ir a Ventas (POS)
          </Link>
        </div>
      </div>

      {/* COMPONENTE CLIENTE DE MERMAS */}
      <MermasClient
        products={JSON.parse(JSON.stringify(products))}
        logs={JSON.parse(JSON.stringify(logs))}
        pendingSales={JSON.parse(JSON.stringify(pendingSales))}
      />
    </div>
  );
}