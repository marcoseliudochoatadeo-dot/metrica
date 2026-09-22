import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  let setting = null;
  try {
    setting = await prisma.systemSetting.findUnique({
      where: { id: 'config' },
    });
  } catch (e) {}

  const appName = setting?.appName || 'Altezza Cocina Italiana';
  return {
    title: `${appName} - METRICA`,
    description: 'Sistema profesional de control de inventarios y barra',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let setting = null;
  try {
    setting = await prisma.systemSetting.findUnique({
      where: { id: 'config' },
    });
  } catch (e) {}

  const bgImage = setting?.backgroundImage || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2000&auto=format&fit=crop';
  const establishmentName = setting?.appName || 'Altezza Cocina Italiana';

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-slate-100 flex flex-col`}
        style={{
          backgroundColor: '#020617',
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.82) 0%, rgba(2, 6, 15, 0.96) 100%), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Barra de Navegación Superior con estilo Glassmorphism y bordes redondeados */}
        <div className="w-full px-4 pt-4 sticky top-0 z-50">
          <header className="max-w-7xl mx-auto bg-slate-900/85 backdrop-blur-md border border-slate-800 px-5 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
            {/* Logotipo / Marca y Establecimiento ahora enlazados a Inicio */}
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-xl group-hover:scale-110 transition">🍸</span>
              <span className="font-extrabold text-white text-sm tracking-wide group-hover:text-amber-400 transition">
                METRICA <span className="text-[10px] font-normal px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md ml-1">v1.0</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">
                {establishmentName}
              </span>
            </Link>

            {/* Enlaces de navegación rápida con estilo de botón suave */}
            <nav className="flex flex-wrap items-center gap-1 text-xs font-medium">
              <Link href="/" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>🏠</span> Inicio
              </Link>
              <Link href="/supplies" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>📦</span> Insumos
              </Link>
              <Link href="/purchases" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>🛒</span> Compras
              </Link>
              <Link href="/inventory" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>⚖️</span> Inventario
              </Link>
              <Link href="/recipes/mixology" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>🍸</span> Mixología
              </Link>
              <Link href="/recipes/subrecipes" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>🌿</span> Subrecetas
              </Link>
              <Link href="/recipes/classics" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>🥃</span> Clásicos
              </Link>
              <Link href="/sales" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>💰</span> Ventas
              </Link>
              <Link href="/waste" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>⚠️</span> Mermas
              </Link>
              <Link href="/settings" className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-400 transition flex items-center gap-1.5 font-bold shadow">
                <span>⚙️</span> Ajustes
              </Link>
            </nav>
          </header>
        </div>

        {/* Contenido Dinámico de la Página Actual */}
        <main className="flex-1 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}