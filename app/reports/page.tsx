'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConsumptionReport } from '../actions';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [secondaryData, setSecondaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await getConsumptionReport();
        if (res.success) {
          setReportData(res.data || []);
          setSecondaryData(res.secondaryConsumption || []);
        } else {
          alert('Error al cargar el reporte: ' + res.error);
        }
      } catch (error) {
        console.error('Error fetching report:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  // Filtro para elementos primarios
  const filteredData = reportData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtro para materias primas secundarias (Azúcar, agua, etc.)
  const filteredSecondaryData = secondaryData.filter(sec => 
    sec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (sec.usedInSubrecipes && sec.usedInSubrecipes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-10 max-w-7xl mx-auto font-sans text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Reporte de Consumo Teórico (Auditoría)</h1>
          <p className="text-sm text-slate-400 mt-1">
            Descubre exactamente cuánta cantidad de cada insumo está deduciendo el sistema en base a las ventas.
          </p>
        </div>
        <Link 
          href="/" 
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2.5 rounded-lg transition shrink-0"
        >
          ← Volver al Menú
        </Link>
      </div>

      {/* BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="Buscar insumo, categoría o materia prima..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-amber-500 transition shadow-lg"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
            >
              ✕
            </button>
          )}
        </div>
        
        {!loading && (
          <div className="text-sm text-slate-400">
            Mostrando <span className="text-amber-400 font-bold">{filteredData.length}</span> primario(s) y <span className="text-amber-400 font-bold">{filteredSecondaryData.length}</span> materia(s)
          </div>
        )}
      </div>

      {/* TABLA PRINCIPAL (ELEMENTOS PRIMARIOS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            📦 Elementos Primarios (Ventas Directas y Subrecetas Terminadas)
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
              Analizando transacciones y desglosando recetas...
            </div>
          ) : reportData.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No hay datos de consumo para mostrar.
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No se encontraron insumos primarios que coincidan con "<span className="text-amber-400">{searchTerm}</span>".
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 pl-6">Insumo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Cant. Descontada</th>
                  <th className="py-3 px-4 text-right">Impacto en Costo ($)</th>
                  <th className="py-3 px-4 pr-6">Utilizado en (Recetas)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 pl-6 font-medium text-white">{item.name}</td>
                    <td className="py-3 px-4 text-xs">{item.category}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                      {item.totalConsumed.toFixed(2)} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-400">
                      ${item.costImpact.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 pr-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500 truncate max-w-[150px]" title={item.usedIn}>
                          {item.usedIn}
                        </span>
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg transition shrink-0"
                        >
                          🔍 Desglose
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* APARTADO: MATERIAS PRIMAS CONSUMIDAS EN SUBRECETAS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-8">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              🧪 Materias Primas Consumidas en Subrecetas (Azúcar, Agua, etc.)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acumulado total de insumos internos gastados a través de las preparaciones de barra durante este turno.
            </p>
          </div>
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold px-3 py-1 rounded-lg">
            {filteredSecondaryData.length} Materia(s) Prima(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-sm animate-pulse">
              Calculando materias primas internas...
            </div>
          ) : secondaryData.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No hay consumo de materias primas en subrecetas registrado en este rango.
            </div>
          ) : filteredSecondaryData.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No se encontraron materias primas que coincidan con "<span className="text-amber-400">{searchTerm}</span>".
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 pl-6">Materia Prima / Insumo Interno</th>
                  <th className="py-3 px-4 text-center">Cantidad Total Gastada</th>
                  <th className="py-3 px-4 pr-6">Utilizado dentro de las Subrecetas:</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSecondaryData.map((sec, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 pl-6 font-medium text-white flex items-center gap-2">
                      <span>🔸</span> {sec.name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                      {sec.totalQty.toFixed(2)} {sec.unit}
                    </td>
                    <td className="py-3 px-4 pr-6 text-xs text-slate-400">
                      {sec.usedInSubrecipes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE DESGLOSE */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
            
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🔍 Desglose Primario: <span className="text-amber-400">{selectedItem.name}</span>
                </h3>
                <div className="flex gap-4 mt-1 text-xs">
                  <p className="text-slate-400">
                    Total consumido: <strong className="text-rose-400">{selectedItem.totalConsumed.toFixed(2)} {selectedItem.unit}</strong>
                  </p>
                  <p className="text-slate-400">
                    Impacto financiero: <strong className="text-amber-400">${selectedItem.costImpact.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-6">
              
              {selectedItem?.secondaryItems && selectedItem.secondaryItems.length > 0 && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                    🧪 Elementos Secundarios (Materia Prima Consumida Internamente)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedItem.secondaryItems?.map((sec: any, idx: number) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-200">{sec.name}</span>
                        <span className="text-xs font-mono font-bold text-rose-400">
                          {sec.qty.toFixed(2)} {sec.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  📋 Historial de Transacciones (Ventas / Salidas)
                </h4>
                {selectedItem.details && selectedItem.details.length > 0 ? (
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-[10px] uppercase bg-slate-900 text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Fecha / Hora</th>
                          <th className="py-3 px-4">Concepto</th>
                          <th className="py-3 px-4 text-right">Cantidad</th>
                          <th className="py-3 px-4 text-right">Impacto ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {selectedItem.details.map((detail: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4 text-xs font-mono text-slate-400">
                              {new Date(detail.date).toLocaleString('es-MX', { 
                                dateStyle: 'medium', 
                                timeStyle: 'short' 
                              })}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-white">
                              {detail.name}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-rose-400">
                              {detail.qty.toFixed(2)} {detail.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-amber-400">
                              ${(detail.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-xs py-4">
                    No hay detalles registrados.
                  </div>
                )}
              </div>

            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}