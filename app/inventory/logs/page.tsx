// app/inventory/logs/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface InventoryLogItem {
  id: string;
  createdAt: string;
  previousWeight: number;
  newWeight: number;
  weightDiff: number;
  previousClosed: number;
  newClosed: number;
  closedDiff: number;
  product: {
    name: string;
    category: string;
    unit: string | null;
  };
}

export default function InventoryLogsPage() {
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros de fecha y hora para los turnos
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      let url = "/api/inventory/logs";
      const params = new URLSearchParams();
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (error) {
      console.error("Error al cargar la bitácora:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(startDate, endDate);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {/* Encabezado y Navegación */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1">
            <span>🍸 Barra Control</span>
            <span>/</span>
            <span>Auditoría</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bitácora de Cortes y Movimientos de Inventario
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Filtra por horario de turno para auditar mermas, consumos y errores de captura con precisión.
          </p>
        </div>
        <Link
          href="/inventory"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition border border-slate-700 flex items-center gap-2"
        >
          ← Volver a Inventario
        </Link>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Panel de Filtros por Turno */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg flex flex-col md:flex-row items-end gap-4"
        >
          <div className="w-full md:w-auto flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Fecha y Hora de Inicio (Turno)
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="w-full md:w-auto flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Fecha y Hora de Fin (Corte)
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="submit"
              className="flex-1 md:flex-initial bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-5 py-2 rounded-lg text-sm transition shadow"
            >
              Filtrar Turno
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition border border-slate-700"
            >
              Mostrar Todo
            </button>
          </div>
        </form>

        {/* Tabla de Resultados */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <span className="text-sm font-medium text-slate-300">
              Registros encontrados: <strong className="text-amber-400">{logs.length}</strong>
            </span>
            {loading && <span className="text-xs text-amber-500 animate-pulse">Cargando movimientos...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Insumo / Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Peso Anterior → Nuevo</th>
                  <th className="py-3 px-4 text-right">Variación Neto</th>
                  <th className="py-3 px-4 text-right">Cerradas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {loading ? "Buscando registros..." : "No hay movimientos registrados en este rango de fechas."}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const unit = log.product?.unit || "g";
                    const isNegative = log.weightDiff < 0;
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap text-xs">
                          {new Date(log.createdAt).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {log.product?.name || "Producto desconocido"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block bg-slate-800 text-amber-400 text-xs px-2 py-0.5 rounded border border-slate-700">
                            {log.product?.category || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-mono text-xs">
                          {log.previousWeight}{unit} → {log.newWeight}{unit}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-semibold text-xs ${isNegative ? "text-rose-400" : "text-emerald-400"}`}>
                          {isNegative ? `${log.weightDiff}${unit}` : `+${log.weightDiff}${unit}`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-300">
                          {log.closedDiff !== 0 ? (
                            <span className={log.closedDiff > 0 ? "text-emerald-400" : "text-rose-400"}>
                              {log.closedDiff > 0 ? `+${log.closedDiff}` : log.closedDiff} u
                            </span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}