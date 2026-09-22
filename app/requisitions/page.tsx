import React from 'react';
import { prisma } from '@/lib/prisma';
import RequisitionsClient from './RequisitionsClient';

export const dynamic = 'force-dynamic';

export default async function RequisitionsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

  return <RequisitionsClient products={products} />;
}