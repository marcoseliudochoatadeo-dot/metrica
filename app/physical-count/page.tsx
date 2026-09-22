import React from 'react';
import { getProducts, getInventoryZones } from '@/app/actions';
import PhysicalCountClient from './PhysicalCountClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PhysicalCountPage() {
  // 1. Obtenemos tanto los productos como las zonas creadas desde la Base de Datos
  const [productsRes, zonesRes] = await Promise.all([
    getProducts(),
    getInventoryZones(), 
  ]);

  const products = productsRes?.data || [];
  const zones = zonesRes?.data || [];

  // 2. Le pasamos ambas variables al Cliente limpias de referencias
  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
        📋 Registrar Inventario Físico
      </h1>
      <PhysicalCountClient 
        products={JSON.parse(JSON.stringify(products))} 
        initialZones={JSON.parse(JSON.stringify(zones))} 
      />
    </div>
  );
}