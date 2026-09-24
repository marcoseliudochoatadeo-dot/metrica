import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import Link from 'next/link';
import LogoutButton from './components/LogoutButton';
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

  // 1. Obtener el usuario actual a través de la cookie de sesión
  let userPermissions = {
    inventory: false,
    supplies: false,
    recipes: false,
    sales: false,
    settings: false,
  };
  let userIsAdmin = false;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (token) {
      // Intentamos buscar por ID o por email dependiendo de qué guarde tu cookie
      let currentUser = await prisma.user.findFirst({
        where: { id: token }
      });

      if (!currentUser) {
        currentUser = await prisma.user.findFirst({
          where: { email: token }
        });
      }

      if (currentUser) {
        const userAny = currentUser as any;
        userIsAdmin = userAny.isAdmin ?? (userAny.role === 'ADMIN');
        
        if (userAny.permissions) {
          try {
            const parsed = JSON.parse(userAny.permissions);
            userPermissions = {
              inventory: !!parsed.inventory,
              supplies: !!parsed.supplies,
              recipes: !!parsed.recipes,
              sales: !!parsed.sales,
              settings: !!parsed.settings,
            };
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('Error al leer permisos del usuario en layout:', e);
  }

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
        {/* Barra de Navegación Superior */}
        <div className="w-full px-4 pt-4 sticky top-0 z-50">
          <header className="max-w-7xl mx-auto bg-slate-900/85 backdrop-blur-md border border-slate-800 px-5 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
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

            {/* Enlaces filtrados estrictamente por permisos */}
            <nav className="flex flex-wrap items-center gap-1 text-xs font-medium">
              <Link href="/" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                <span>🏠</span> Inicio
              </Link>

              {(userIsAdmin || userPermissions.supplies) && (
                <Link href="/supplies" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                  <span>📦</span> Insumos
                </Link>
              )}

              {(userIsAdmin || userPermissions.supplies) && (
                <Link href="/purchases" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                  <span>🛒</span> Compras
                </Link>
              )}

              {(userIsAdmin || userPermissions.inventory) && (
                <Link href="/inventory" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                  <span>⚖️</span> Inventario
                </Link>
              )}

              {(userIsAdmin || userPermissions.recipes) && (
                <>
                  <Link href="/recipes/mixology" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                    <span>🍸</span> Mixología
                  </Link>
                  <Link href="/recipes/subrecipes" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                    <span>🌿</span> Subrecetas
                  </Link>
                  <Link href="/recipes/classics" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                    <span>🥃</span> Clásicos
                  </Link>
                </>
              )}

              {(userIsAdmin || userPermissions.sales) && (
                <Link href="/sales" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                  <span>💰</span> Ventas
                </Link>
              )}

              {(userIsAdmin || userPermissions.sales) && (
                <Link href="/waste" className="px-3 py-2 rounded-xl hover:bg-slate-800/80 hover:text-amber-400 text-slate-300 transition flex items-center gap-1.5">
                  <span>⚠️</span> Mermas
                </Link>
              )}

              {(userIsAdmin || userPermissions.settings) && (
                <Link href="/settings" className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-400 transition flex items-center gap-1.5 font-bold shadow">
                  <span>⚙️</span> Ajustes
                </Link>
              )}
              
              <LogoutButton />
            </nav>
          </header>
        </div>

        <main className="flex-1 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}