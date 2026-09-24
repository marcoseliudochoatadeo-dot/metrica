'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '@/app/actions'; // <-- Importamos las acciones de seguridad

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // Estado para mostrar errores
  const [successMessage, setSuccessMessage] = useState(''); // Estado para mensajes de éxito

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      if (isLogin) {
        // FLUJO DE INICIO DE SESIÓN
        const res = await loginUser(email, password);
        if (res.success) {
          router.push('/'); // Redirigir al Menú Principal
        } else {
          setErrorMessage(res.error || 'Error al iniciar sesión');
        }
      } else {
        // FLUJO DE REGISTRO
        const res = await registerUser(name, email, password);
        if (res.success) {
          setSuccessMessage(res.message);
          setIsLogin(true); // Cambiamos la vista a login
          setPassword('');  // Limpiamos la contraseña por seguridad
        } else {
          setErrorMessage(res.error || 'Error al registrar el usuario');
        }
      }
    } catch (error: any) {
      setErrorMessage('Ocurrió un error inesperado de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19] p-4 font-sans overflow-y-auto">
      {/* Círculos decorativos de fondo (Estilo Altezza / Métrica) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl z-10">
        
        {/* LOGO Y BIENVENIDA */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg mb-4">
            <span className="text-2xl font-black text-slate-950">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            MÉTRICA <span className="text-amber-500 text-sm align-top">v2.0</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 uppercase tracking-widest font-semibold">
            Altezza Cocina Italiana
          </p>
        </div>

        {/* SELECTOR LOGIN / REGISTRO */}
        <div className="flex bg-slate-950 rounded-lg p-1 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
              isLogin ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
              !isLogin ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Mensajes de Error y Éxito */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center">
            {successMessage}
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Marcos Eliud"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-sm outline-none focus:border-amber-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@altezza.com"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-sm outline-none focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 text-sm outline-none focus:border-amber-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold py-3 rounded-lg text-sm transition mt-6 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:shadow-none cursor-pointer"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Ingresar al Sistema' : 'Registrar Usuario')}
          </button>
        </form>
      </div>
    </div>
  );
}