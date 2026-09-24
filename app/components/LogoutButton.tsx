'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/app/actions';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition flex items-center gap-1.5 font-bold shadow"
    >
      <span>🚪</span> Cerrar Sesión
    </button>
  );
}