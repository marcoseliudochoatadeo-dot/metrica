import React from 'react';
import { prisma } from '@/lib/prisma';
import OperationsClient from './OperationsClient';

export default async function OperationsPage() {
  const tasks = await prisma.checklistTask.findMany({
    orderBy: { createdAt: 'asc' },
  }).catch(() => []);

  const recipes = await prisma.recipe?.findMany?.().catch(() => []) || [];
  const incidents = await prisma.barIncident?.findMany?.({
    orderBy: { createdAt: 'desc' },
    take: 20,
  }).catch(() => []) || [];

  return (
    <OperationsClient 
      initialTasks={tasks} 
      initialRecipes={recipes} 
      initialIncidents={incidents} 
    />
  );
}