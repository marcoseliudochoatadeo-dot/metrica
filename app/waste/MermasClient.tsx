'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { auditAndCloseShift } from '@/app/actions';

export default function MermasClient({
  products = [],
  logs = [],
  pendingSales = [],
}: {
  products: any[];
  logs: any[];
  pendingSales: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 1. Calcular Consumo Teórico POS (basado en las ventas pendientes del turno)
  const theoreticalUsage: Record<string, { name: string; mlTeoricos: number; category: string }> = {};

  pendingSales.forEach((sale: any) => {
    if (sale.recipeId && sale.recipe) {
      sale.recipe.items.forEach((item: any) => {
        const pId = item.productId;
        const ml = (item.quantity || 0) * sale.quantity;
        if (!theoreticalUsage[pId]) {
          theoreticalUsage[pId] = {
            name: item.product?.name || 'Insumo',
            mlTeoricos: 0,
            category: item.product?.category || 'General',
          };
        }
        theoreticalUsage[pId].mlTeoricos += ml;
      });
    } else if (sale.productId && sale.product) {
      const pId = sale.productId;
      let ml = 0;
      if (sale.saleMode === 'BOTELLA') {
        ml = (sale.product.capacity || 750) * sale.quantity;
      } else {
        const isWine = (sale.product.category || '').toLowerCase().includes('vino');
        ml = (isWine ? 150 : 45) * sale.quantity;
      }
      if (!theoreticalUsage[pId]) {
        theoreticalUsage[pId] = {
          name: sale.product.name,
          mlTeoricos: 0,
          category: sale.product.category || 'General',
        };
      }
      theoreticalUsage[pId].mlTeoricos += ml;
    }
  });

  // 2. Calcular Consumo Real (basado en los registros negativos de peso en logs de la báscula)
  const realUsage: Record<string, { name: string; mlReales: number }> = {};
  logs.forEach((log) => {
    if (log.weightDiff < 0 && log.productId) {
      const pId = log.productId;
      const pName = log.product?.name || `Insumo (${pId.slice(-4)})`;
      const ml = Math.abs(log.weightDiff);

      if (!realUsage[pId]) {
        realUsage[pId] = { name: pName, mlReales: 0 };
      }
      realUsage[pId].mlReales += ml;
    }
  });

  const allProductIds = Array.from(
    new Set([...Object.keys(theoreticalUsage), ...Object.keys(realUsage)])
  );

  const handleCloseShift = () => {
    if (!confirm('¿Estás seguro de cerrar el turno? Esto archivará las ventas actuales y reiniciará la matriz de mermas para el próximo turno.')) {
      return;
    }

    startTransition(async () => {
      const res = await auditAndCloseShift();
      if (res.success) {
        alert('¡Turno cerrado con éxito!');
        router.refresh();
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            📊 Resumen del Turno Actual
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ventas registradas pendientes de auditar: <strong className="text-white">{pendingSales.length} tickets</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleCloseShift}
          disabled={isPending || pendingSales.length === 0}
          className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs px-5 py-3 rounded-lg transition shadow-lg cursor-pointer"
        >
          {isPending ? 'Procesando...' : '🔒 Cerrar Turno y Reiniciar Auditoría'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/40 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">
            ⚖️ Matriz de Diferencias (Teórico POS vs Real Báscula)
          </h2>
        </div>

        <div className="overflow-x-auto">
          {allProductIds.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No hay consumos ni ventas registradas en este turno para auditar.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-4 text-center">Teórico POS (Vendido)</th>
                  <th className="py-3 px-4 text-center">Real Báscula (Pesado)</th>
                  <th className="py-3 px-4 text-center">Diferencia Neta</th>
                  <th className="py-3 px-4 text-center">Estado / Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allProductIds.map((pId) => {
                  const teorico = theoreticalUsage[pId]?.mlTeoricos || 0;
                  const real = realUsage[pId]?.mlReales || 0;
                  const diff = real - teorico;

                  const name =
                    theoreticalUsage[pId]?.name ||
                    realUsage[pId]?.name ||
                    `Insumo (${pId.slice(-4)})`;

                  return (
                    <tr key={pId} className="hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4 font-medium text-white">{name}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {teorico.toFixed(0)} ml/g
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-amber-400">
                        {real.toFixed(0)} ml/g
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        {diff === 0 ? (
                          <span className="text-slate-500">0 ml/g</span>
                        ) : diff > 0 ? (
                          <span className="text-rose-400 font-bold">+{diff.toFixed(0)} ml/g</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">{diff.toFixed(0)} ml/g</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {diff > 30 ? (
                          <span className="bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded text-[11px] font-bold border border-rose-500/20">
                            FALTANTE (MERMA)
                          </span>
                        ) : diff < -30 ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded text-[11px] font-bold border border-emerald-500/20">
                            SOBRANTE
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-[11px] font-bold border border-slate-700">
                            CUADRADO
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}