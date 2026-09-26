'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createChecklistTask, deleteChecklistTask, createBarIncident } from '../actions';

export default function OperationsClient({ 
  initialTasks = [], 
  initialRecipes = [],
  initialIncidents = [] 
}: { 
  initialTasks: any[];
  initialRecipes: any[];
  initialIncidents: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout' | 'produccion' | 'recetario' | 'mermas'>('checkin');
  
  // Estado para nueva tarea dinámica
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [loading, setLoading] = useState(false);

  // Estado para nueva incidencia / merma
  const [incidentType, setIncidentType] = useState('MERMA');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentQty, setIncidentQty] = useState(1);
  const [incidentResponsible, setIncidentResponsible] = useState('');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setLoading(true);
      const res = await createChecklistTask(newTaskType, newTaskTitle);
      if (!res.success) throw new Error(res.error);

      setNewTaskTitle('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al crear la tarea.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta instrucción?')) return;
    try {
      await deleteChecklistTask(id);
      router.refresh();
    } catch (err: any) {
      alert('Error al eliminar tarea.');
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDesc.trim()) return;

    try {
      setLoading(true);
      const res = await createBarIncident({
        type: incidentType,
        description: incidentDesc,
        quantity: incidentQty,
        responsible: incidentResponsible,
      });
      if (!res.success) throw new Error(res.error);

      setIncidentDesc('');
      setIncidentQty(1);
      setIncidentResponsible('');
      alert('Incidencia registrada con éxito.');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al registrar.');
    } finally {
      setLoading(false);
    }
  };

  const checkInTasks = initialTasks.filter((t: any) => t.type === 'CHECK_IN');
  const checkOutTasks = initialTasks.filter((t: any) => t.type === 'CHECK_OUT');

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            ⚙️ Módulo de Operaciones y Control de Barra
          </h1>
          <p className="text-sm text-slate-400">
            Gestiona check-lists de apertura, cierre, producción diaria, recetario multimedia y registro de mermas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-4 py-2.5 rounded-lg transition"
          >
            ← Menú Principal
          </Link>
        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'checkin' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          📥 Check-In (Apertura)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checkout')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'checkout' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          📤 Check-Out (Cierre)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('produccion')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'produccion' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          🧪 Producción Diaria / Bateo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recetario')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'recetario' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          📖 Recetario Multimedia y Video
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mermas')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'mermas' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ⚠️ Mermas e Incidencias
        </button>
      </div>

      {/* FORMULARIO PARA AGREGAR TAREAS DINÁMICAS */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          ➕ Agregar Nueva Tarea o Instrucción Personalizada
        </h2>
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">Módulo</label>
            <select
              value={newTaskType}
              onChange={(e) => setNewTaskType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs outline-none focus:border-amber-500 font-mono"
            >
              <option value="CHECK_IN">Check-In (Apertura)</option>
              <option value="CHECK_OUT">Check-Out (Cierre)</option>
            </select>
          </div>
          <div className="sm:col-span-7">
            <label className="block text-xs font-medium text-slate-400 mb-1">Descripción de la Tarea</label>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Ej. RELLENAR JARRAS DE VIDRIO, DESMONTAR CAFETERA..."
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs outline-none focus:border-amber-500 uppercase"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-bold p-2.5 rounded-lg text-xs transition cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Agregar Tarea'}
            </button>
          </div>
        </form>
      </section>

      {/* CHECK-IN */}
      {activeTab === 'checkin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            ✨ Lista de Apertura y Montaje de Barra (Check-In)
          </h2>
          {checkInTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No hay tareas de apertura configuradas. Agrega una arriba.</div>
          ) : (
            <div className="space-y-2">
              {checkInTasks.map((task: any) => (
                <div key={task.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 accent-amber-500 cursor-pointer" />
                    <span className="text-sm text-white font-medium">{task.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHECK-OUT */}
      {activeTab === 'checkout' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            🌙 Lista de Cierre y Desmontaje (Check-Out)
          </h2>
          {checkOutTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No hay tareas de cierre configuradas. Agrega una arriba.</div>
          ) : (
            <div className="space-y-2">
              {checkOutTasks.map((task: any) => (
                <div key={task.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 accent-amber-500 cursor-pointer" />
                    <span className="text-sm text-white font-medium">{task.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRODUCCIÓN */}
      {activeTab === 'produccion' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            🧪 Ejecución de Producción de Jarabes y Pulpas
          </h2>
          <p className="text-xs text-slate-400">
            Accede al motor de bateo para registrar lotes del día y descontar insumos del almacén central automáticamente.
          </p>
          <div className="pt-2">
            <Link
              href="/inventory"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs transition inline-block cursor-pointer"
            >
              Abrir Módulo de Producción / Inventario
            </Link>
          </div>
        </div>
      )}

      {/* RECETARIO */}
      {activeTab === 'recetario' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            📖 Recetario de Barra con Video y Proceso
          </h2>
          <p className="text-xs text-slate-400">
            Consulta ingredientes, cantidades, fotografía de presentación y videos de preparación paso a paso.
          </p>
          <div className="text-xs text-slate-500 py-6 text-center">
            {initialRecipes.length === 0 ? 'No hay recetas registradas todavía.' : 'Listado de recetas disponible.'}
          </div>
        </div>
      )}

      {/* MERMAS E INCIDENCIAS */}
      {activeTab === 'mermas' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
              ⚠️ Registro de Mermas y Cristalería Quebrada
            </h2>
            <form onSubmit={handleCreateIncident} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Incidencia</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs outline-none focus:border-amber-500 font-mono"
                >
                  <option value="MERMA">Merma / Producto dañado</option>
                  <option value="CRISTALERIA_ROTA">Cristalería Quebrada</option>
                  <option value="INCIDENCIA">Incidencia General</option>
                </select>
              </div>
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-slate-400 mb-1">Descripción</label>
                <input
                  type="text"
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Ej. Vaso old fashioned roto / Jarabe fermentado"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs outline-none focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={incidentQty}
                  onChange={(e) => setIncidentQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs text-center outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 text-white font-bold p-2.5 rounded-lg text-xs transition cursor-pointer"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">📋 Historial de Incidencias Recientes</h2>
            {initialIncidents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">Sin incidencias registradas recientemente.</div>
            ) : (
              <div className="space-y-2">
                {initialIncidents.map((inc: any) => (
                  <div key={inc.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-mono mr-2">{inc.type}</span>
                      <span className="text-white font-medium">{inc.description}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span className="font-mono text-amber-400">Cant: {inc.quantity}</span>
                      <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}