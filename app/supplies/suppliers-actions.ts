'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSuppliers() {
  try {
    return await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    return [];
  }
}

export async function createSupplier(data: {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  address?: string;
  notes?: string;
}) {
  try {
    await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactName: data.contactName?.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim(),
        taxId: data.taxId?.trim(),
        address: data.address?.trim(),
        notes: data.notes?.trim(),
      },
    });
    revalidatePath('/supplies');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al guardar proveedor' };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await prisma.supplier.delete({ where: { id } });
    revalidatePath('/supplies');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'No se pudo eliminar el proveedor' };
  }
}