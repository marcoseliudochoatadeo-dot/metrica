import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let setting = null;
  try {
    setting = await prisma.systemSetting.findUnique({
      where: { id: 'config' },
    });
  } catch (e) {}

  const establishmentName = setting?.appName || 'Altezza Cocina Italiana';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Cabecera con jerarquía de marca profesional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍷</span>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              METRICA <span className="text-xs font-normal px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full ml-2">v1.0</span>
            </h1>
          </div>
          <p className="text-sm font-bold text-amber-400 mt-2 tracking-wide uppercase">
            Establecimiento: <span className="text-white underline decoration-amber-500/50 underline-offset-4">{establishmentName}</span>
          </p>
        </div>
        <Link
          href="/settings"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-4 py-3 rounded-xl transition shadow flex items-center gap-2 w-fit"
        >
          <span>⚙️ Configuración</span>
        </Link>
      </div>

      {/* Cuadrícula completa con TODOS los módulos operativos reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link href="/inventory" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Inventario</h2>
          <p className="text-xs text-slate-400 mt-1">Control por pesaje y tara por subcategorías.</p>
        </Link>

        <Link href="/warehouse" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Almacén / CEDIS</h2>
          <p className="text-xs text-slate-400 mt-1">Control global de existencias y recepción de compras en standby.</p>
        </Link>

        <Link href="/supplies" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Insumos</h2>
          <p className="text-xs text-slate-400 mt-1">Catálogo general de compras y proveedores.</p>
        </Link>

        <Link href="/purchases" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Compras</h2>
          <p className="text-xs text-slate-400 mt-1">Registro de notas, folios y validación de facturas físicas.</p>
        </Link>

        <Link href="/recipes/mixology" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Mixología</h2>
          <p className="text-xs text-slate-400 mt-1">Cócteles de autor, recetas y costeo.</p>
        </Link>

        <Link href="/recipes/classics" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Cócteles Clásicos</h2>
          <p className="text-xs text-slate-400 mt-1">Recetario estándar de barra.</p>
        </Link>

        <Link href="/recipes/mocktails" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Bebidas Sin Alcohol</h2>
          <p className="text-xs text-slate-400 mt-1">Mocktails, premixes y refrescos artesanales.</p>
        </Link>

        <Link href="/recipes/subrecipes" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Subrecetas</h2>
          <p className="text-xs text-slate-400 mt-1">Gestión de preparaciones, jarabes e infusiones.</p>
        </Link>

        <Link href="/requisitions" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Requerimientos</h2>
          <p className="text-xs text-slate-400 mt-1">Generación de listas de pedido a almacén.</p>
        </Link>

        <Link href="/sales" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Ventas</h2>
          <p className="text-xs text-slate-400 mt-1">Registro diario de desplazamientos e ingresos.</p>
        </Link>

        <Link href="/waste" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Merma</h2>
          <p className="text-xs text-slate-400 mt-1">Control de desperdicios, goteo y roturas.</p>
        </Link>

        <Link href="/settings" className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition group">
          <h2 className="text-base font-bold text-white group-hover:text-amber-400 transition">Configuración</h2>
          <p className="text-xs text-slate-400 mt-1">Ajustes del sistema, nombre del establecimiento y wallpaper.</p>
        </Link>
      </div>
    </div>
  );
}