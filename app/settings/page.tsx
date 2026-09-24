'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'language'>('general');
  const [appName, setAppName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Estados para la gestión de usuarios
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const resSettings = await fetch('/api/settings');
        const settingsData = await resSettings.json();
        if (settingsData) {
          setAppName(settingsData.appName || '');
          setBackgroundImage(settingsData.backgroundImage || '');
        }

        const resUsers = await fetch('/api/users');
        const usersData = await resUsers.json();
        if (Array.isArray(usersData)) {
          setUsersList(usersData);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setBackgroundImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, backgroundImage }),
      });

      if (res.ok) {
        setMessage('¡Configuración guardada con éxito! Actualizando...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage('Error al guardar los cambios.');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      setMessage('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  // Función para actualizar los permisos de un empleado específico
  const handleUpdateUser = async (userId: string, newRoleLabel: string, newIsAdmin: boolean, currentPermissions: any) => {
    setUserLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roleLabel: newRoleLabel,
          isAdmin: newIsAdmin,
          permissions: currentPermissions,
        }),
      });

      if (res.ok) {
        alert('¡Permisos y puesto actualizados correctamente!');
      } else {
        alert('Error al actualizar el usuario.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de red al actualizar.');
    } finally {
      setUserLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-sans">
        Cargando panel de configuración...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Cabecera general */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide flex items-center gap-2">
            <span>⚙️</span> Centro de Configuración
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra los parámetros globales, accesos y personalización de METRICA.
          </p>
        </div>
        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2 w-fit"
        >
          <span>← Menú Principal</span>
        </Link>
      </div>

      {/* Estructura de dos columnas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Menú Lateral */}
        <aside className="md:col-span-1 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl h-fit space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pb-2">
            Preferencias
          </p>
          
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'general'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span>🎨</span> Apariencia y Temas
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span>👥</span> Usuarios y Permisos
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'language'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span>🌐</span> Idioma y Región
          </button>
        </aside>

        {/* Contenido Dinámico */}
        <main className="md:col-span-3 space-y-6">
          
          {/* SECCIÓN 1: APARIENCIA */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>🎨</span> Apariencia y Personalización Visual
              </h2>

              {message && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl font-semibold">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Nombre del Establecimiento / Restaurante
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Ej. Altezza Cocina Italiana"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Wallpaper de Fondo (Imagen del Dispositivo)
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-5 py-3 rounded-xl transition shadow flex items-center gap-2">
                    <span>📁 Seleccionar Archivo...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400">
                    {backgroundImage.startsWith('data:image') ? 'Imagen cargada correctamente' : 'Ningún archivo nuevo seleccionado'}
                  </span>
                </div>
              </div>

              {backgroundImage && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Vista previa:
                  </label>
                  <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                    <img src={backgroundImage} alt="Wallpaper" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-lg"
                >
                  {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          )}

          {/* SECCIÓN 2: USUARIOS Y PERMISOS */}
          {activeTab === 'users' && (
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>👥</span> Gestión de Empleados y Permisos
              </h2>
              <p className="text-xs text-slate-400">
                Asigna puestos personalizados a tu equipo (como Carlos o Pablo) y configura exactamente qué módulos pueden operar.
              </p>

              <div className="space-y-6">
                {usersList.map((user) => {
                  // Parsear permisos guardados en JSON de forma segura y estructurada
                  let userPerms = { inventory: true, supplies: true, recipes: true, sales: true, settings: false };
                  try {
                    const parsed = JSON.parse(user.permissions || '{}');
                    userPerms = {
                      inventory: !!(parsed.inventory ?? parsed.inventario ?? true),
                      supplies: !!(parsed.supplies ?? parsed.insumos ?? parsed.purchases ?? true),
                      recipes: !!(parsed.recipes ?? parsed.recetas ?? parsed.mixology ?? true),
                      sales: !!(parsed.sales ?? parsed.ventas ?? parsed.waste ?? true),
                      settings: !!(parsed.settings ?? parsed.configuracion ?? parsed.ajustes ?? false),
                    };
                  } catch (e) {}

                  return (
                    <div key={user.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white">{user.name}</h3>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-slate-400 font-medium">Etiqueta de Puesto:</label>
                          <input
                            type="text"
                            defaultValue={user.roleLabel || 'Empleado'}
                            onBlur={(e) => {
                              user.roleLabel = e.target.value;
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Checkboxes de Permisos */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPerms.inventory}
                            onChange={(e) => {
                              userPerms.inventory = e.target.checked;
                              setUsersList([...usersList]); // Forzar renderizado para guardar el cambio
                            }}
                            className="accent-amber-500 rounded"
                          />
                          Inventario
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPerms.supplies}
                            onChange={(e) => {
                              userPerms.supplies = e.target.checked;
                              setUsersList([...usersList]);
                            }}
                            className="accent-amber-500 rounded"
                          />
                          Insumos / Compras
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPerms.recipes}
                            onChange={(e) => {
                              userPerms.recipes = e.target.checked;
                              setUsersList([...usersList]);
                            }}
                            className="accent-amber-500 rounded"
                          />
                          Recetas / Mixología
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPerms.sales}
                            onChange={(e) => {
                              userPerms.sales = e.target.checked;
                              setUsersList([...usersList]);
                            }}
                            className="accent-amber-500 rounded"
                          />
                          Ventas / Mermas
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPerms.settings}
                            onChange={(e) => {
                              userPerms.settings = e.target.checked;
                              setUsersList([...usersList]);
                            }}
                            className="accent-amber-500 rounded"
                          />
                          Configuración / Ajustes
                        </label>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleUpdateUser(user.id, user.roleLabel, user.isAdmin, userPerms)}
                          disabled={userLoading}
                          className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition shadow"
                        >
                          Guardar Cambios de {user.name}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: IDIOMA */}
          {activeTab === 'language' && (
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>🌐</span> Idioma y Configuración Regional
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona el idioma principal del sistema de inventarios y los formatos de moneda y fecha.
              </p>
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Idioma del Sistema
                </label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition">
                  <option value="es">Español (Latinoamérica)</option>
                  <option value="en">English (US)</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}