'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [appName, setAppName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setAppName(data.appName || '');
          setBackgroundImage(data.backgroundImage || '');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando configuración:', err);
        setLoading(false);
      });
  }, []);

  // Función para manejar la selección de archivos desde el dispositivo
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

  const handleSave = async (e: React.FormEvent) => {
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

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-sans">
        Cargando configuración del sistema...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto font-sans text-slate-100">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide flex items-center gap-2">
            <span>⚙️</span> Configuración del Sistema
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personaliza el nombre de tu establecimiento y el wallpaper de fondo.
          </p>
        </div>
        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2 w-fit"
        >
          <span>← Menú Principal</span>
        </Link>
      </div>

      {/* Formulario de Configuración */}
      <form onSubmit={handleSave} className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        {message && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl font-semibold">
            {message}
          </div>
        )}

        {/* Nombre del Establecimiento */}
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

        {/* Subir Imagen desde el Dispositivo */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Subir Imagen de Fondo (Wallpaper) desde tu Dispositivo
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

        {/* URL o Base64 (Opcional manual) */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            O pega una URL / Código Base64 directamente:
          </label>
          <textarea
            value={backgroundImage}
            onChange={(e) => setBackgroundImage(e.target.value)}
            placeholder="https://... o código Base64"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-400 font-mono outline-none focus:border-amber-500 transition resize-y"
          />
        </div>

        {/* Vista previa del wallpaper */}
        {backgroundImage && (
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Vista previa del wallpaper actual:
            </label>
            <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
              <img
                src={backgroundImage}
                alt="Vista previa"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Botón de Guardar */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2"
          >
            <span>{saving ? 'Guardando...' : '💾 Guardar Cambios y Aplicar'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}