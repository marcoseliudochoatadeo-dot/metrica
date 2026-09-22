'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createRecipe(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const type = (formData.get('type') as string) || 'MIXOLOGY';
    const imageUrl = (formData.get('imageUrl') as string) || null;
    const price = parseFloat(formData.get('salePrice') as string) || 0;
    const description = formData.get('description') as string;
    
    const yieldQuantity = parseFloat(formData.get('yieldQuantity') as string) || 1;
    const yieldUnit = (formData.get('yieldUnit') as string) || 'ml';

    if (!name) {
      return { success: false, error: 'El nombre es obligatorio' };
    }

    const productIds = formData.getAll('productId') as string[];
    const quantities = formData.getAll('quantity') as string[];
    const units = formData.getAll('unit') as string[];

    const items = productIds
      .map((productId, index) => ({
        productId,
        quantity: parseFloat(quantities[index]) || 0,
        unit: units[index] || 'ml',
      }))
      .filter((item) => item.productId && item.quantity > 0);

    // 1. Calculamos el COSTO REAL de producción del lote antes de guardarlo
    let totalBatchCost = 0;
    for (const item of items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (prod) {
        const prodCost = Number(prod.costPrice || 0);
        const prodCapacity = Number(prod.capacity || 1);
        const unitCost = prodCapacity > 0 ? prodCost / prodCapacity : 0;

        const recipeUnit = (item.unit || 'ml').toLowerCase();
        const productUnit = (prod.unit || 'ml').toLowerCase();
        let conversionFactor = 1;

        if ((recipeUnit === 'gr' && productUnit === 'kg') || (recipeUnit === 'ml' && productUnit === 'lt')) {
          conversionFactor = 0.001;
        } else if ((recipeUnit === 'kg' && productUnit === 'gr') || (recipeUnit === 'lt' && productUnit === 'ml')) {
          conversionFactor = 1000;
        }

        totalBatchCost += unitCost * (item.quantity * conversionFactor);
      }
    }

    const recipe = await (prisma as any).recipe.create({
      data: {
        name,
        type,
        imageUrl,
        price,
        description,
        yieldQuantity,
        yieldUnit,
        items: {
          create: items,
        },
      },
    });

    // 2. SI ES SUBRECETA: La registramos en el inventario con su costo de lote calculado
    const isSub = type.toUpperCase().includes('SUB');
    if (isSub) {
      await prisma.product.create({
        data: {
          name: `[Subreceta] ${name}`,
          category: 'Preparaciones y Jarabes',
          capacity: yieldQuantity, 
          unit: yieldUnit,         
          tareWeight: 0,
          currentWeight: yieldQuantity, 
          stockClosed: 0,
          costPrice: totalBatchCost, // <-- ¡Aquí guardamos el costo real calculado ($44.50)!)
          supplier: 'Producción Interna',
        },
      });
    }

    revalidatePath('/recipes');
    revalidatePath('/products');
    revalidatePath(`/recipes/${type.toLowerCase()}`);
    return { success: true, data: JSON.parse(JSON.stringify(recipe)) };
  } catch (error: any) {
    console.error('Error al crear receta:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteRecipe(id: string) {
  try {
    const recipeToDelete = await (prisma as any).recipe.findUnique({
      where: { id },
    });

    const deletedRecipe = await (prisma as any).recipe.delete({
      where: { id },
    });

    if (recipeToDelete && recipeToDelete.type.toUpperCase().includes('SUB')) {
      await prisma.product.deleteMany({
        where: { name: `[Subreceta] ${recipeToDelete.name}` },
      });
    }

    revalidatePath('/recipes');
    revalidatePath('/products');
    if (deletedRecipe?.type) {
      revalidatePath(`/recipes/${deletedRecipe.type.toLowerCase()}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar receta:', error);
    return { success: false, error: error.message };
  }
}

export async function updateRecipe(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const type = (formData.get('type') as string) || 'MIXOLOGY';
    const imageUrl = (formData.get('imageUrl') as string) || null;
    const price = parseFloat(formData.get('salePrice') as string) || 0;
    const description = formData.get('description') as string;
    
    const yieldQuantity = parseFloat(formData.get('yieldQuantity') as string) || 1;
    const yieldUnit = (formData.get('yieldUnit') as string) || 'ml';

    if (!name) {
      return { success: false, error: 'El nombre es obligatorio' };
    }

    const productIds = formData.getAll('productId') as string[];
    const quantities = formData.getAll('quantity') as string[];
    const units = formData.getAll('unit') as string[];

    const items = productIds
      .map((productId, index) => ({
        productId,
        quantity: parseFloat(quantities[index]) || 0,
        unit: units[index] || 'ml',
      }))
      .filter((item) => item.productId && item.quantity > 0);

    // 1. Recalculamos el costo de producción actualizado del lote
    let totalBatchCost = 0;
    for (const item of items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (prod) {
        const prodCost = Number(prod.costPrice || 0);
        const prodCapacity = Number(prod.capacity || 1);
        const unitCost = prodCapacity > 0 ? prodCost / prodCapacity : 0;

        const recipeUnit = (item.unit || 'ml').toLowerCase();
        const productUnit = (prod.unit || 'ml').toLowerCase();
        let conversionFactor = 1;

        if ((recipeUnit === 'gr' && productUnit === 'kg') || (recipeUnit === 'ml' && productUnit === 'lt')) {
          conversionFactor = 0.001;
        } else if ((recipeUnit === 'kg' && productUnit === 'gr') || (recipeUnit === 'lt' && productUnit === 'ml')) {
          conversionFactor = 1000;
        }

        totalBatchCost += unitCost * (item.quantity * conversionFactor);
      }
    }

    const oldRecipe = await (prisma as any).recipe.findUnique({ where: { id } });

    const updatedRecipe = await (prisma as any).recipe.update({
      where: { id },
      data: {
        name,
        type,
        imageUrl,
        price,
        description,
        yieldQuantity,
        yieldUnit,
        items: {
          deleteMany: {},
          create: items,
        },
      },
    });

    // 2. Actualizamos también el producto en el inventario con su nueva capacidad, unidad Y costo real
    const isSub = type.toUpperCase().includes('SUB');
    if (isSub && oldRecipe) {
      const oldProductName = `[Subreceta] ${oldRecipe.name}`;
      const newProductName = `[Subreceta] ${name}`;

      await prisma.product.updateMany({
        where: { name: oldProductName },
        data: {
          name: newProductName,
          capacity: yieldQuantity,
          unit: yieldUnit,
          costPrice: totalBatchCost, // <-- Actualizamos el costo en el inventario
        },
      });
    }

    revalidatePath('/recipes');
    revalidatePath('/products');
    revalidatePath(`/recipes/${type.toLowerCase()}`);

    return { success: true, data: JSON.parse(JSON.stringify(updatedRecipe)) };
  } catch (error: any) {
    console.error('Error al actualizar receta:', error);
    return { success: false, error: error.message };
  }
}