import React from 'react';
import { getProducts, getPendingSales } from '@/app/actions';
import { prisma } from '@/lib/prisma';
import SalesPageClient from './SalesPageClient';

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

export default async function SalesPage() {
  let recipes: any[] = [];
  try {
    recipes = await prisma.recipe.findMany({
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    try {
      recipes = await prisma.recipe.findMany({ orderBy: { name: 'asc' } });
    } catch (e) {
      recipes = [];
    }
  }

  const [productsRes, pendingSalesRes] = await Promise.all([
    getProducts(),
    getPendingSales(),
  ]);

  const products = productsRes?.data || productsRes || [];
  const pendingSales = pendingSalesRes?.data || [];

  const suppliersRaw = await prisma.product.findMany({
    select: { supplier: true },
    where: { supplier: { not: "" } },
  });
  
  const existingSuppliers = Array.from(
    new Set(suppliersRaw.map((p) => p.supplier).filter(Boolean))
  ) as string[];

  return (
    <SalesPageClient
      recipes={JSON.parse(JSON.stringify(recipes))}
      products={JSON.parse(JSON.stringify(products))}
      pendingSales={JSON.parse(JSON.stringify(pendingSales))}
      existingSuppliers={existingSuppliers}
    />
  );
}