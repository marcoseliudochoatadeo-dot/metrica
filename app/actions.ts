'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

// ==========================================
// INVENTARIO Y BÁSCULA 
// ==========================================

export async function updateInventoryWeight(
  productId: string,
  measurementMethod: string,
  openValues: number[],
  newClosedUnits: number
) {
  try {
    if (!productId) {
      return { success: false, error: 'ID de producto no válido' };
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { openBottles: true },
    });

    if (!currentProduct) {
      return { success: false, error: 'Producto no encontrado' };
    }

    const newWeight = openValues.reduce((acc, val) => acc + (Number(val) || 0), 0);
    const previousWeight = currentProduct.currentWeight || 0;
    const previousClosed = currentProduct.stockClosed || 0;

    const isInitialLoad = previousWeight === 0 && previousClosed === 0 && newWeight === 0 && newClosedUnits === 0;

    const weightDiff = isInitialLoad ? 0 : newWeight - previousWeight;
    const closedDiff = isInitialLoad ? 0 : newClosedUnits - previousClosed;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          measurementMethod,
          currentWeight: newWeight,
          stockClosed: newClosedUnits,
        },
      });

      await tx.openBottle.deleteMany({
        where: { productId },
      });

      if (openValues.length > 0) {
        await tx.openBottle.createMany({
          data: openValues.map((val) => ({
            productId,
            value: Number(val) || 0,
          })),
        });
      }

      if (!isInitialLoad && (weightDiff !== 0 || closedDiff !== 0)) {
        await tx.inventoryLog.create({
          data: {
            productId,
            previousWeight,
            newWeight,
            weightDiff,
            previousClosed,
            newClosed: newClosedUnits,
            closedDiff,
          },
        });
      }

      return await tx.product.findUnique({
        where: { id: productId },
        include: { openBottles: true },
      });
    });

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error('Error al actualizar peso de inventario:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar en la base de datos',
    };
  }
}

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        openBottles: true,
      },
      orderBy: { 
        name: 'asc' 
      },
    });
    return { success: true, data: JSON.parse(JSON.stringify(products)) };
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return { success: false, data: [] };
  }
}

// ==========================================
// GESTIÓN DE INSUMOS (PRODUCTS)
// ==========================================

export async function createProduct(data: any) {
  try {
    const cleanName = String(data.name).trim();

    const existingProducts = await prisma.product.findMany({
      select: { name: true }
    });
    
    const alreadyExists = existingProducts.some(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (alreadyExists) {
      return { success: false, error: `Ya existe un producto registrado con el nombre "${cleanName}".` };
    }

    const newProduct = await prisma.product.create({
      data: {
        name: cleanName,
        category: data.category || 'Otros',
        subtype: data.subtype || '', 
        capacity: parseFloat(data.capacity) || 0,
        unit: data.unit || 'g',
        tareWeight: parseFloat(data.tareWeight) || 0,
        currentWeight: 0,
        stockClosed: 0,
        costPrice: parseFloat(data.costPrice) || 0,
        salePrice: parseFloat(data.salePrice) || 0,
        glassPrice: parseFloat(data.glassPrice) || 0,
        minStock: parseFloat(data.minStock) || 1, 
        maxStock: parseFloat(data.maxStock) || 10, 
        supplier: data.supplier || '',
        measurementMethod: data.measurementMethod || 'SCALE',
      },
    });

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    return { success: true, data: JSON.parse(JSON.stringify(newProduct)) };
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    return { success: false, error: error.message };
  }
}

export async function updateProduct(id: string, data: any) {
  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        subtype: data.subtype || '', 
        capacity: parseFloat(data.capacity) || 0,
        unit: data.unit || 'g',
        tareWeight: parseFloat(data.tareWeight) || 0,
        costPrice: parseFloat(data.costPrice) || 0,
        salePrice: parseFloat(data.salePrice) || 0,
        glassPrice: parseFloat(data.glassPrice) || 0,
        minStock: parseFloat(data.minStock) || 1, 
        maxStock: parseFloat(data.maxStock) || 10, 
        supplier: data.supplier || '',
        measurementMethod: data.measurementMethod || 'SCALE',
      },
    });

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    return { success: true, data: JSON.parse(JSON.stringify(updatedProduct)) };
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id },
    });

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);
    return { success: false, error: error.message };
  }
}

export async function getInventoryLogs() {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, data: JSON.parse(JSON.stringify(logs)) };
  } catch (error: any) {
    console.error('Error al obtener historial de inventario:', error);
    return { success: false, data: [] };
  }
}

// ==========================================
// MOTOR CORREGIDO DE DESCUENTO DE INVENTARIO
// ==========================================

async function applyInventoryDeduction(tx: any, product: any, totalDeductionMl: number) {
  const catLower = (product.category || '').toLowerCase();
  
  const isLiquorOrWine = [
    'destilado', 'destilados', 'licor', 'licores', 'vinos', 'vino', 'tinto', 'blanco', 
    'rosado', 'espumoso', 'champagne', 'cava', 'tequila', 'mezcal', 'ron', 'gin', 
    'ginebra', 'whisky', 'vodka', 'brandy', 'cognac'
  ].some((c) => catLower.includes(c));

  if (isLiquorOrWine && Number(product.capacity || 0) > 0) {
    const pCap = Number(product.capacity || 750);
    const tare = Number(product.tareWeight || 0);
    const method = product.measurementMethod || 'SCALE';
    let stockClosed = Number(product.stockClosed || 0);
    let currentWeight = Number(product.currentWeight || 0);

    let netOpenMl = 0;

    if (method === 'PORTION') {
      netOpenMl = currentWeight * pCap;
    } else {
      if (currentWeight > tare) {
        netOpenMl = currentWeight - tare;
      }
    }

    let totalMlGlobal = (stockClosed * pCap) + netOpenMl;
    totalMlGlobal = totalMlGlobal - totalDeductionMl;

    let newClosedUnits = 0;
    let remainderMl = 0;

    if (totalMlGlobal >= 0) {
      newClosedUnits = Math.floor(totalMlGlobal / pCap);
      remainderMl = totalMlGlobal % pCap;
    } else {
      newClosedUnits = 0;
      remainderMl = totalMlGlobal; 
    }

    let newCurrentWeight = 0;
    if (method === 'PORTION') {
      newCurrentWeight = pCap > 0 ? remainderMl / pCap : 0;
    } else {
      if (remainderMl < 0) {
        newCurrentWeight = tare + remainderMl; 
      } else {
        newCurrentWeight = remainderMl > 0 ? remainderMl + tare : (newClosedUnits > 0 ? tare : 0);
      }
    }

    await tx.product.update({
      where: { id: product.id },
      data: {
        stockClosed: Math.max(0, newClosedUnits),
        currentWeight: newCurrentWeight, 
      },
    });

    await tx.openBottle.deleteMany({
      where: { productId: product.id }
    });

  }  else {
    // --- TRADUCTOR DE UNIDADES BLINDADO CONTRA RECETAS EN GRAMOS ---
    let currentStockClosed = Number(product.stockClosed || 0);
    let currentWeight = Number(product.currentWeight || 0);
    const capacity = Number(product.capacity || 1); 
    const unit = (product.unit || 'pz').toLowerCase();

    let deductionInCapacityUnits = totalDeductionMl; 

    // 1. ESTANDARIZAR LA DEDUCCIÓN AL TIPO DE CAPACIDAD Y ESCALA DE RECETA
    if (['lt', 'l', 'litro', 'litros'].includes(unit)) {
      deductionInCapacityUnits = totalDeductionMl / 1000;
    } 
    else if (['kg', 'kilo', 'kilos', 'g', 'gramos'].includes(unit)) {
      // Si el insumo está en kg/g pero la receta descuenta en gramos masivos a través de subrecetas
      if (totalDeductionMl > 50) {
        deductionInCapacityUnits = totalDeductionMl / 1000;
      } else {
        deductionInCapacityUnits = totalDeductionMl;
      }
    }
    else if (['pz', 'pza', 'pieza', 'piezas', 'lata'].includes(unit)) {
      if (totalDeductionMl > 10 && capacity > 10) {
        deductionInCapacityUnits = totalDeductionMl;
      } else {
        deductionInCapacityUnits = totalDeductionMl * capacity;
      }
    } 
    else {
      deductionInCapacityUnits = totalDeductionMl;
      if (capacity === 1 && totalDeductionMl > 5) {
        deductionInCapacityUnits = totalDeductionMl / 1000;
      }
    }

    // 2. CASCADA UNIVERSAL (ABRIR BOTELLAS/PAQUETES AUTOMÁTICAMENTE)
    while (currentWeight < deductionInCapacityUnits && currentStockClosed > 0) {
      currentStockClosed -= 1;          
      currentWeight += capacity;        
    }

    // Restamos la cantidad exacta normalizada
    currentWeight = currentWeight - deductionInCapacityUnits;

    // 3. CASCADA INVERSA (REEMPAQUETAR SI SOBREPASA LA CAPACIDAD EN DEVOLUCIONES)
    while (currentWeight >= capacity && capacity > 0) {
      currentWeight -= capacity;
      currentStockClosed += 1;
    }

    await tx.product.update({
      where: { id: product.id },
      data: {
        stockClosed: Math.max(0, currentStockClosed),
        currentWeight: currentWeight,
      },
    });

    await tx.openBottle.deleteMany({
      where: { productId: product.id }
    });
  }
}

export async function createSale(
  type: 'RECIPE' | 'PRODUCT',
  itemId: string,
  quantitySold: number = 1,
  saleMode: string = 'RECETA',
  deductionMl: number = 0,
  explicitSalePrice: number = 0
) {
  try {
    if (!itemId) {
      return { success: false, error: 'ID no válido' };
    }

    await prisma.$transaction(async (tx) => {
      if (type === 'RECIPE') {
        const recipe = await tx.recipe.findUnique({
          where: { id: itemId },
          include: { items: { include: { product: true } } },
        });

        if (!recipe) throw new Error('Receta no encontrada');

        // Costo unitario corregido con protección de conversión de unidades
        const unitCost = recipe.items.reduce((acc: number, item: any) => {
          if (!item.product) return acc;
          const pCost = Number(item.product.costPrice || 0);
          const pCap = Number(item.product.capacity || 1);
          const pUnit = (item.product.unit || 'ml').toLowerCase();
          const ingQty = Number(item.quantity || 0);

          let deductionInCapUnits = ingQty;
          if (['lt', 'l', 'litro', 'litros', 'kg', 'kilo', 'kilos'].includes(pUnit)) {
            deductionInCapUnits = ingQty / 1000;
          } else if (['pz', 'pza', 'pieza', 'piezas', 'lata'].includes(pUnit)) {
            if (ingQty > 10 && pCap > 10) deductionInCapUnits = ingQty;
            else deductionInCapUnits = ingQty * pCap;
          } else {
            if (pCap === 1 && ingQty > 5) deductionInCapUnits = ingQty / 1000;
          }

          const fraction = pCap > 0 ? deductionInCapUnits / pCap : 0;
          return acc + (fraction * pCost);
        }, 0);

        const totalCost = unitCost * quantitySold;
        const baseUnitPrice = recipe.price || 0;
        const finalPrice = explicitSalePrice > 0 ? explicitSalePrice : baseUnitPrice * quantitySold;

        await tx.sale.create({
          data: {
            recipeId: itemId,
            quantity: quantitySold,
            saleMode: 'RECETA',
            status: 'PENDING',
            price: finalPrice,
            cost: totalCost,
          },
        });

        for (const recipeItem of recipe.items) {
          if (!recipeItem.product) continue;
          const totalDeductionMl = (recipeItem.quantity || 0) * quantitySold;
          await applyInventoryDeduction(tx, recipeItem.product, totalDeductionMl);
        }

      } else if (type === 'PRODUCT') {
        const product = await tx.product.findUnique({
          where: { id: itemId },
        });

        if (!product) throw new Error('Producto no encontrado');

        const pCost = Number(product.costPrice || 0);
        const pCap = Number(product.capacity || 750);
        let totalCost = 0;
        let totalMlToDeduce = 0;
        let modeToSave = saleMode;
        let finalPrice = 0;

        const catLower = (product.category || '').toLowerCase();
        const nameLower = (product.name || '').toLowerCase();
        const isStrictPiece = [
          'mezclador', 'mezcladores', 'refresco', 'agua', 'cerveza', 'cafe', 'café', 'pieza',
          'mocktail', 'mixologia', 'mixología', 'cocteleria', 'coctelería'
        ].some((cat) => catLower.includes(cat));

        if (isStrictPiece || saleMode === 'PIEZA') {
          totalCost = pCost * quantitySold;
          modeToSave = 'PIEZA';
          const unitSalePrice = Number(product.salePrice || 0);
          finalPrice = explicitSalePrice > 0 ? explicitSalePrice : (unitSalePrice * quantitySold);

          await tx.sale.create({
            data: {
              productId: itemId,
              quantity: quantitySold, 
              saleMode: modeToSave,
              status: 'PENDING',
              price: finalPrice,
              cost: totalCost,
            },
          });

          const currentStock = Number(product.stockClosed || 0);
          await tx.product.update({
            where: { id: product.id },
            data: { stockClosed: Math.max(0, currentStock - quantitySold) },
          });

        } else if (saleMode === 'BOTELLA') {
          totalCost = pCost * quantitySold;
          const unitSalePrice = Number(product.salePrice || 0);
          finalPrice = explicitSalePrice > 0 ? explicitSalePrice : (unitSalePrice * quantitySold);

          await tx.sale.create({
            data: {
              productId: itemId,
              quantity: quantitySold, 
              saleMode: 'BOTELLA',
              status: 'PENDING',
              price: finalPrice,
              cost: totalCost,
            },
          });

          const currentClosed = Number(product.stockClosed || 0);
          await tx.product.update({
            where: { id: product.id },
            data: { stockClosed: Math.max(0, currentClosed - quantitySold) },
          });

        } else {
          const isWineOrEspumoso = [
            'vinos', 'vino', 'tinto', 'blanco', 'rosado', 'espumoso', 'champagne', 'cava'
          ].some((c) => catLower.includes(c));

          const defaultMl = isWineOrEspumoso ? 150 : 45;
          const portions = quantitySold > 0 ? quantitySold : 1;
          totalMlToDeduce = defaultMl * portions;

          const costPerMl = pCap > 0 ? pCost / pCap : 0;
          totalCost = costPerMl * totalMlToDeduce;

          const glassPrice = Number(product.glassPrice || 0);
          finalPrice = explicitSalePrice > 0 ? explicitSalePrice : (glassPrice * portions);

          await tx.sale.create({
            data: {
              productId: itemId,
              quantity: portions, 
              saleMode: 'COPEO',
              status: 'PENDING',
              price: finalPrice, 
              cost: totalCost,
            },
          });

          await applyInventoryDeduction(tx, product, totalMlToDeduce);
        }
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true, message: 'Venta registrada y stock descontado con éxito.' };
  } catch (error: any) {
    console.error('Error al procesar la venta:', error);
    return { success: false, error: error.message || 'Error al registrar la venta.' };
  }
}

export async function getPendingSales() {
  try {
    const sales = await prisma.sale.findMany({
      where: { status: 'PENDING' },
      include: {
        recipe: {
          include: { items: { include: { product: true } } },
        },
        product: true,
      },
    });
    return { success: true, data: JSON.parse(JSON.stringify(sales)) };
  } catch (error: any) {
    console.error('Error al obtener ventas pendientes:', error);
    return { success: false, data: [] };
  }
}

export async function auditAndCloseShift() {
  try {
    await prisma.sale.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'AUDITED' },
    });

    revalidatePath('/mermas');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true, message: 'Turno cerrado y auditoría reseteada correctamente.' };
  } catch (error: any) {
    console.error('Error al cerrar turno:', error);
    return { success: false, error: error.message || 'Error al cerrar el turno.' };
  }
}

export async function importProductsFromExcel(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No se ha proporcionado ningún archivo.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return { success: false, error: 'El archivo Excel está vacío o no tiene el formato correcto.' };
    }

    const existingProductsDb = await prisma.product.findMany({
      select: { name: true }
    });
    const existingNames = new Set(existingProductsDb.map(p => p.name.toLowerCase().trim()));

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const rawName = row['Nombre'] || row['nombre'] || row['PRODUCTO'] || row['Name'];
      if (!rawName) continue;

      const cleanName = String(rawName).trim();

      if (existingNames.has(cleanName.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const category = row['Categoria'] || row['Categoría'] || row['CATEGORIA'] || 'Abarrotes';
      const subtype = row['Subtipo'] || row['SUBTIPO'] || row['subtype'] || '';
      const supplier = row['Proveedor'] || row['PROVEEDOR'] || row['Supplier'] || '';
      const capacity = parseFloat(row['Capacidad'] || row['CAPACIDAD'] || row['capacity'] || 1000);
      const costPrice = parseFloat(row['Costo'] || row['COSTO'] || row['costPrice'] || 0);
      const unit = row['Unidad'] || row['UNIDAD'] || row['unit'] || 'ml';
      const tareWeight = parseFloat(row['Tara'] || row['TARA'] || row['tareWeight'] || 0);

      await prisma.product.create({
        data: {
          name: cleanName,
          category: String(category).trim(),
          subtype: String(subtype).trim(),
          supplier: String(supplier).trim(),
          capacity: isNaN(capacity) ? 1000 : capacity,
          costPrice: isNaN(costPrice) ? 0 : costPrice,
          unit: String(unit).trim(),
          tareWeight: isNaN(tareWeight) ? 0 : tareWeight,
          currentWeight: 0,
          stockClosed: 0,
          measurementMethod: 'SCALE',
        },
      });
      
      existingNames.add(cleanName.toLowerCase());
      importedCount++;
    }

    return { 
      success: true, 
      count: importedCount, 
      message: `Se importaron ${importedCount} productos nuevos. Se omitieron ${skippedCount} duplicados.` 
    };
  } catch (error: any) {
    console.error('Error al importar Excel:', error);
    return { success: false, error: error.message || 'Error al procesar el archivo.' };
  }
}

export async function updateAllInventoryWeights(items: { productId: string; measurementMethod: string; openValues: number[]; newClosedUnits: number }[]) {
  try {
    for (const item of items) {
      if (!item.productId) continue;

      const currentProduct = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { openBottles: true },
      });

      if (!currentProduct) continue;

      const newWeight = item.openValues.reduce((acc, val) => acc + (Number(val) || 0), 0);
      const previousWeight = currentProduct.currentWeight || 0;
      const previousClosed = currentProduct.stockClosed || 0;

      const isInitialLoad = previousWeight === 0 && previousClosed === 0 && newWeight === 0 && item.newClosedUnits === 0;

      const weightDiff = isInitialLoad ? 0 : newWeight - previousWeight;
      const closedDiff = isInitialLoad ? 0 : item.newClosedUnits - previousClosed;

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            measurementMethod: item.measurementMethod,
            currentWeight: newWeight,
            stockClosed: item.newClosedUnits,
            lastCountMap: (item as any).lastCountMap || null,
          },
        });

        await tx.openBottle.deleteMany({
          where: { productId: item.productId },
        });

        if (item.openValues.length > 0) {
          await tx.openBottle.createMany({
            data: item.openValues.map((val) => ({
              productId: item.productId,
              value: Number(val) || 0,
            })),
          });
        }

        if (!isInitialLoad && (weightDiff !== 0 || closedDiff !== 0)) {
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              previousWeight,
              newWeight,
              weightDiff,
              previousClosed,
              newClosed: item.newClosedUnits,
              closedDiff,
            },
          });
        }
      });
    }

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Error al actualizar inventario masivo:', error);
    return { success: false, error: error.message || 'Error al actualizar en la base de datos' };
  }
}

export async function exportInventoryToExcel() {
  try {
    const products = await prisma.product.findMany({
      include: { openBottles: true },
      orderBy: { name: 'asc' },
    });

    const reportData = products.map((p) => {
      const stockClosed = p.stockClosed || 0;
      const cost = p.costPrice || 0;
      const capacity = p.capacity || 0;
      const tara = p.tareWeight || 0;
      const rawWeight = p.currentWeight || 0;

      let netMl = 0;
      let openRatio = 0;

      if (p.openBottles && p.openBottles.length > 0) {
        if (p.measurementMethod === 'PORTION') {
          openRatio = p.openBottles.reduce((acc, b) => acc + (b.value || 0), 0);
        } else {
          netMl = p.openBottles.reduce((acc, b) => acc + Math.max(0, (b.value || 0) - tara), 0);
          openRatio = capacity > 0 ? netMl / capacity : 0;
        }
      } else {
        if (rawWeight > tara) {
          netMl = rawWeight - tara;
          openRatio = capacity > 0 ? netMl / capacity : 0;
        }
      }

      const totalUnitsEquivalent = stockClosed + openRatio;
      const totalValue = (stockClosed * cost) + (openRatio * cost);

      return {
        'Producto': p.name,
        'Categoría': p.category,
        'Subtipo / Región': p.subtype || 'N/D',
        'Stock Total (Unidades)': Number(totalUnitsEquivalent.toFixed(2)),
        'Capacidad (ml/g)': capacity,
        'Costo Unitario ($)': cost,
        'Valor Total ($)': Number(totalValue.toFixed(2)),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario General');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return {
      success: true,
      fileData: Buffer.from(excelBuffer).toString('base64'),
      fileName: `Inventario_Barra_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  } catch (error: any) {
    console.error('Error al exportar Excel:', error);
    return { success: false, error: error.message };
  }
}

export async function updateLogReason(logId: string, reason: string) {
  try {
    await prisma.inventoryLog.update({
      where: { id: logId },
      data: { reason },
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar la justificación:", error);
    return { success: false, error: "No se pudo guardar la justificación" };
  }
}

export async function getInventoryZones() {
  try {
    const zones = await prisma.inventoryZone.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: JSON.parse(JSON.stringify(zones)) };
  } catch (error) {
    console.error('Error al obtener zonas:', error);
    return { success: false, data: [] };
  }
}

export async function createInventoryZone(name: string) {
  try {
    const newZone = await prisma.inventoryZone.create({
      data: { name: String(name).trim() }
    });
    revalidatePath('/physical-count'); 
    return { success: true, data: JSON.parse(JSON.stringify(newZone)) };
  } catch (error: any) {
    return { success: false, error: 'La zona ya existe o hubo un error.' };
  }
}

export async function deleteInventoryZone(id: string) {
  try {
    await prisma.inventoryZone.delete({ where: { id } });
    revalidatePath('/physical-count');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Error al eliminar zona.' };
  }
}

export async function getProductionRecipes() {
  try {
    const allRecipes = await prisma.recipe.findMany({
      include: { items: { include: { product: true } } }
    });
    return { success: true, data: JSON.parse(JSON.stringify(allRecipes)) };
  } catch (error) {
    return { success: false, error: 'Error al cargar recetas de producción' };
  }
}

export async function registerProduction(recipeId: string, batches: number) {
  try {
    // 1. AHORA INCLUIMOS EL OBJETO 'product' COMPLETO EN LA RECETA
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { items: { include: { product: true } } } 
    });
    
    if (!recipe) throw new Error('Receta no encontrada');

    const targetProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { name: recipe.name },
          { name: `[Subreceta] ${recipe.name}` },
          { name: `[SUBRECETA] ${recipe.name}` },
          { name: { contains: recipe.name } }
        ]
      }
    });

    await prisma.$transaction(async (tx) => {
      // 2. SUMAR AL INVENTARIO LO QUE FABRICAMOS (CON CASCADA HACIA ARRIBA)
      if (targetProduct) {
         const amountToAdd = recipe.yieldQuantity * batches;
         
         let currentWeight = Number(targetProduct.currentWeight || 0);
         let stockClosed = Number(targetProduct.stockClosed || 0);
         const capacity = Number(targetProduct.capacity || 1);

         currentWeight += amountToAdd;

         // Si lo fabricado supera la capacidad, lo sella automáticamente como unidad cerrada.
         while (currentWeight >= capacity && capacity > 0) {
           currentWeight -= capacity;
           stockClosed += 1;
         }

         await tx.product.update({
           where: { id: targetProduct.id },
           data: { 
             currentWeight: currentWeight,
             stockClosed: stockClosed
           }
         });
      }

      // 3. DESCONTAR LOS INGREDIENTES CON EL MOTOR INTELIGENTE DE CASCADA
      for (const item of recipe.items) {
         if (!item.product) continue;
         const amountToDeduct = (item.quantity || 0) * batches;
         
         // Usamos el mismo traductor blindado que en las ventas:
         await applyInventoryDeduction(tx, item.product, amountToDeduct);
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSale(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      recipe: {
        include: { items: { include: { product: true } } },
      },
      product: true,
    },
  });

  if (!sale) {
    throw new Error('La venta no existe.');
  }

  await prisma.$transaction(async (tx) => {
    if (sale.recipeId && sale.recipe) {
      for (const item of sale.recipe.items) {
        if (!item.product) continue;
        const mlReturned = (item.quantity || 0) * sale.quantity;
        await applyInventoryDeduction(tx, item.product, -mlReturned);
      }
    } else if (sale.productId && sale.product) {
      const catLower = (sale.product.category || '').toLowerCase();
      const isStrictPiece = [
        'mezclador', 'mezcladores', 'refresco', 'agua', 'cerveza', 'cafe', 'café', 'pieza',
        'mocktail', 'mixologia', 'mixología', 'cocteleria', 'coctelería'
      ].some((cat) => catLower.includes(cat));

      if (isStrictPiece || sale.saleMode === 'PIEZA' || sale.saleMode === 'BOTELLA') {
        const currentClosed = Number(sale.product.stockClosed || 0);
        await tx.product.update({
          where: { id: sale.productId },
          data: { stockClosed: currentClosed + sale.quantity },
        });
      } else {
        const isWineOrEspumoso = [
          'vinos', 'vino', 'tinto', 'blanco', 'rosado', 'espumoso', 'champagne', 'cava'
        ].some((c) => catLower.includes(c));
        
        const mlPerPortion = isWineOrEspumoso ? 150 : 45; 
        const mlReturned = mlPerPortion * sale.quantity;
        
        await applyInventoryDeduction(tx, sale.product, -mlReturned);
      }
    }

    await tx.sale.delete({
      where: { id: saleId },
    });
  });

  revalidatePath('/inventory');
  revalidatePath('/sales');
  revalidatePath('/');

  return { success: true };
}

export async function createRequisitionOrder(items: { productId: string; quantityRequested: number }[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: 'No hay productos en la requisición' };
    }

    const newOrder = await prisma.requisitionOrder.create({
      data: {
        status: 'PENDING',
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantityRequested: item.quantityRequested,
            quantityDelivered: 0,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    revalidatePath('/requisitions');
    return { success: true, data: JSON.parse(JSON.stringify(newOrder)) };
  } catch (error: any) {
    console.error('Error al crear requisición:', error);
    return { success: false, error: error.message || 'Error al guardar la orden en standby' };
  }
}

export async function getPendingRequisitions() {
  try {
    const orders = await prisma.requisitionOrder.findMany({
      where: { status: 'PENDING' },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: JSON.parse(JSON.stringify(orders)) };
  } catch (error: any) {
    console.error('Error al obtener requisiciones pendientes:', error);
    return { success: false, data: [] };
  }
}

export async function confirmRequisitionOrder(orderId: string, receivedItems: { itemId: string; quantityDelivered: number }[]) {
  try {
    const order = await prisma.requisitionOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return { success: false, error: 'La orden de requisición no fue encontrada.' };
    }

    if (order.status === 'COMPLETED') {
      return { success: false, error: 'Esta orden ya fue surtida previamente.' };
    }

    for (const received of receivedItems) {
      const orderItem = order.items.find((i) => i.id === received.itemId);
      if (!orderItem) continue;

      const qtyDelivered = Number(received.quantityDelivered) || 0;
      if (qtyDelivered <= 0) continue;

      const productId = orderItem.productId;
      const product = orderItem.product;
      if (!product) continue;

      await prisma.requisitionItem.update({
        where: { id: orderItem.id },
        data: { quantityDelivered: qtyDelivered },
      });

      const currentWarehouseStock = Number(product.warehouseStock) || 0;
      const newWarehouseStock = Math.max(0, currentWarehouseStock - qtyDelivered);

      const currentBarStock = Number(product.stockClosed) || 0;
      const newBarStock = currentBarStock + qtyDelivered;

      await prisma.product.update({
        where: { id: productId },
        data: {
          warehouseStock: newWarehouseStock,
          stockClosed: newBarStock,
        },
      });
    }

    await prisma.requisitionOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    return { success: true, message: '¡Requisición surtida y stock actualizado con éxito!' };
  } catch (error: any) {
    console.error('Error al confirmar requisición:', error);
    return { success: false, error: error.message || 'Error al procesar la entrega en el servidor.' };
  }
}

export async function getPurchaseHistory() {
  try {
    const history = await prisma.purchaseOrder.findMany({
      where: { status: 'RECEIVED' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: JSON.parse(JSON.stringify(history)) };
  } catch (error: any) {
    console.error('Error al obtener historial de compras:', error);
    return { success: false, error: error.message || 'Error al cargar el historial' };
  }
}

export async function registerWarehouseAdjustment(productId: string, adjustmentQty: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) throw new Error("Producto no encontrado");

      const currentStock = Number(product.warehouseStock || 0);
      const newStock = Math.max(0, currentStock + adjustmentQty);
      const difference = newStock - currentStock;

      await tx.product.update({
        where: { id: productId },
        data: { warehouseStock: newStock },
      });

      await tx.warehouseAuditLog.create({
        data: {
          productId: product.id,
          productName: product.name,
          previousStock: currentStock,
          physicalStock: newStock,
          difference: difference,
          unitCost: product.costPrice || 0,
          totalLoss: difference * (product.costPrice || 0),
        },
      });
    });

    revalidatePath('/warehouse');
    return { success: true, message: 'Ajuste de almacén registrado con éxito.' };
  } catch (error: any) {
    console.error('Error al registrar ajuste de almacén:', error);
    return { success: false, error: error.message || 'Error al procesar el ajuste' };
  }
}

import { hash, compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'altezza_secreto_metrica_2026_super_seguro');

export async function registerUser(name: string, email: string, passwordRaw: string) {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { success: false, error: 'Este correo ya está registrado.' };

    const hashedPassword = await hash(passwordRaw, 10);
    const totalUsers = await prisma.user.count();
    const role = totalUsers === 0 ? 'ADMIN' : 'STAFF';

    await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    return { success: true, message: 'Usuario creado con éxito. Ahora inicia sesión.' };
  } catch (error: any) {
    console.error('Error en registro:', error);
    return { success: false, error: 'Error al registrar el usuario.' };
  }
}

export async function loginUser(email: string, passwordRaw: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: 'Credenciales incorrectas.' };

    const isValid = await compare(passwordRaw, user.password);
    if (!isValid) return { success: false, error: 'Credenciales incorrectas.' };

    const token = await new SignJWT({ id: user.id, name: user.name, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return { success: true, message: `Bienvenido de vuelta, ${user.name}` };
  } catch (error: any) {
    console.error('Error en login:', error);
    return { success: false, error: 'Error al iniciar sesión.' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  return { success: true };
}

export async function updateUserPermissions(formData: FormData) {
  const userId = formData.get('userId') as string;
  const roleLabel = formData.get('roleLabel') as string;
  const isAdmin = formData.get('isAdmin') === 'on';

  const permissions = {
    inventory: formData.get('perm_inventory') === 'on',
    supplies_purchases: formData.get('perm_supplies') === 'on',
    recipes: formData.get('perm_recipes') === 'on',
    waste_sales: formData.get('perm_sales') === 'on',
    settings: formData.get('perm_settings') === 'on',
  };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        roleLabel: roleLabel || 'Empleado',
        isAdmin: isAdmin,
        permissions: JSON.stringify(permissions),
      },
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar permisos:', error);
    return { success: false, error: 'No se pudo actualizar el usuario' };
  }
}

export async function createChecklistTask(type: 'CHECK_IN' | 'CHECK_OUT', title: string, dayOfWeek?: string) {
  try {
    if (!title || title.trim() === '') return { success: false, error: 'El título es obligatorio.' };
    await prisma.checklistTask.create({
      data: { type, title: title.trim().toUpperCase(), dayOfWeek: dayOfWeek ? dayOfWeek.toUpperCase() : null, isActive: true },
    });
    revalidatePath('/operations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al guardar la tarea.' };
  }
}

export async function deleteChecklistTask(id: string) {
  try {
    await prisma.checklistTask.delete({ where: { id } });
    revalidatePath('/operations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createBarIncident(data: { type: string; description: string; quantity: number; cost?: number; responsible?: string }) {
  try {
    await prisma.barIncident.create({
      data: {
        type: data.type,
        description: data.description,
        quantity: Number(data.quantity) || 1,
        cost: Number(data.cost) || 0,
        responsible: data.responsible || 'General',
      },
    });
    revalidatePath('/operations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getConsumptionReport() {
  try {
    const recentSales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        product: { 
          include: { 
            recipeItems: { include: { product: true } } 
          } 
        },
        recipe: { 
          include: { 
            items: { include: { product: true } } 
          } 
        }
      }
    });

    const consumptionMap: Record<string, { 
      name: string; 
      category: string; 
      unit: string; 
      totalConsumed: number; 
      costImpact: number; 
      usedIn: Set<string>;
      details: { date: Date, name: string, qty: number, unit: string, cost: number }[];
      secondaryItemsMap: Record<string, { name: string, qty: number, unit: string }>;
    }> = {};

    const globalSecondaryMap: Record<string, { name: string; unit: string; totalQty: number; usedInSubrecipes: Set<string> }> = {};

    const allRecipes = await prisma.recipe.findMany({
      include: { items: { include: { product: true } } }
    });

    recentSales.forEach((sale: any) => {
      const qtySold = Number(sale.quantity) || 1;
      const productVendido = sale.product;
      const recipeVendida = sale.recipe;

      let itemsToDeduct: any[] = [];
      let saleName = 'Venta Desconocida';

      if (productVendido && productVendido.recipeItems && productVendido.recipeItems.length > 0) {
        itemsToDeduct = productVendido.recipeItems;
        saleName = productVendido.name;
      } else if (recipeVendida && recipeVendida.items && recipeVendida.items.length > 0) {
        itemsToDeduct = recipeVendida.items;
        saleName = recipeVendida.name || 'Receta';
      }

      if (itemsToDeduct.length > 0) {
        itemsToDeduct.forEach((item: any) => {
          const ingredient = item.product;
          if (!ingredient) return;

          const recipeQty = Number(item.quantity) || 0;
          const totalIngredientUsed = recipeQty * qtySold; 
          
          const pCap = Number(ingredient.capacity || 1);
          const pUnit = (ingredient.unit || 'g').toLowerCase();
          
          let deductionInCapUnits = totalIngredientUsed;
          if (['lt', 'l', 'litro', 'litros', 'kg', 'kilo', 'kilos'].includes(pUnit)) {
            deductionInCapUnits = totalIngredientUsed / 1000;
          } else if (['pz', 'pza', 'pieza', 'piezas', 'lata'].includes(pUnit)) {
            if (totalIngredientUsed > 10 && pCap > 10) deductionInCapUnits = totalIngredientUsed;
            else deductionInCapUnits = totalIngredientUsed * pCap;
          } else {
            if (pCap === 1 && totalIngredientUsed > 5) deductionInCapUnits = totalIngredientUsed / 1000;
          }

          const fraction = pCap > 0 ? deductionInCapUnits / pCap : 0;
          const estimatedCost = fraction * (Number(ingredient.costPrice) || 0);

          if (!consumptionMap[ingredient.id]) {
            consumptionMap[ingredient.id] = {
              name: ingredient.name,
              category: ingredient.category || 'N/A',
              unit: ingredient.unit || 'g/ml',
              totalConsumed: 0,
              costImpact: 0,
              usedIn: new Set(),
              details: [],
              secondaryItemsMap: {}
            };
          }

          consumptionMap[ingredient.id].totalConsumed += totalIngredientUsed;
          consumptionMap[ingredient.id].costImpact += estimatedCost;
          consumptionMap[ingredient.id].usedIn.add(saleName);
          
          consumptionMap[ingredient.id].details.push({
            date: sale.createdAt,
            name: `${qtySold}x ${saleName}`,
            qty: totalIngredientUsed,
            unit: ingredient.unit || 'g/ml',
            cost: estimatedCost
          });

          // VINCULAR MATERIA PRIMA SECUNDARIA CON CONVERSIÓN DE ESCALA AUTOMÁTICA
          const matchingRecipe = allRecipes.find(r => 
            r.name.toLowerCase().trim() === ingredient.name.replace(/\[Subreceta\]/gi, '').toLowerCase().trim()
          );

          if (matchingRecipe && matchingRecipe.items) {
            matchingRecipe.items.forEach((subItem: any) => {
              const subIngredient = subItem.product;
              if (!subIngredient) return;

              const subQtyInRecipe = Number(subItem.quantity) || 0;
              
              let totalSubUsed = (subQtyInRecipe * totalIngredientUsed);
              let subUnit = subIngredient.unit || 'g/ml';
              const unitLower = subUnit.toLowerCase();

              if ((unitLower.includes('g') || unitLower.includes('ml')) && totalSubUsed > 1000) {
                totalSubUsed = totalSubUsed / 1000;
                if (unitLower.includes('g')) subUnit = 'kg';
                if (unitLower.includes('ml')) subUnit = 'lt';
              }

              if (!consumptionMap[ingredient.id].secondaryItemsMap[subIngredient.id]) {
                consumptionMap[ingredient.id].secondaryItemsMap[subIngredient.id] = {
                  name: subIngredient.name,
                  qty: 0,
                  unit: subUnit
                };
              }
              consumptionMap[ingredient.id].secondaryItemsMap[subIngredient.id].qty += totalSubUsed;

              if (!globalSecondaryMap[subIngredient.id]) {
                globalSecondaryMap[subIngredient.id] = {
                  name: subIngredient.name,
                  unit: subUnit,
                  totalQty: 0,
                  usedInSubrecipes: new Set()
                };
              }
              globalSecondaryMap[subIngredient.id].totalQty += totalSubUsed;
              globalSecondaryMap[subIngredient.id].usedInSubrecipes.add(ingredient.name);
            });
          }
        });
      } else if (productVendido) {
        const pCost = Number(productVendido.costPrice) || 0;
        const pCap = Number(productVendido.capacity || 1);
        const catLower = (productVendido.category || '').toLowerCase();
        
        let equivalentUnitsConsumed = 0; 
        let costVal = 0;
        let displayUnit = 'Botella(s)/Pza(s)'; 
        let detailUnit = '';
        let detailQty = 0;

        if (sale.saleMode === 'COPEO') {
          const isWineOrEspumoso = ['vinos', 'vino', 'tinto', 'blanco', 'rosado', 'espumoso', 'champagne', 'cava'].some(c => catLower.includes(c));
          const mlPerPortion = isWineOrEspumoso ? 150 : 45;
          const totalMl = qtySold * mlPerPortion;
          equivalentUnitsConsumed = pCap > 0 ? (totalMl / pCap) : 0; 
          costVal = equivalentUnitsConsumed * pCost;
          detailQty = qtySold;
          detailUnit = 'Copa(s) / Trago(s)';
        } else if (sale.saleMode === 'BOTELLA') {
          equivalentUnitsConsumed = qtySold;
          costVal = qtySold * pCost;
          detailQty = qtySold;
          detailUnit = 'Botella(s)';
        } else if (sale.saleMode === 'PIEZA') {
          equivalentUnitsConsumed = qtySold;
          costVal = qtySold * pCost;
          detailQty = qtySold;
          detailUnit = 'Pza(s)';
          displayUnit = 'Pza(s)';
        } else {
          equivalentUnitsConsumed = qtySold;
          costVal = qtySold * pCost;
          detailQty = qtySold;
          detailUnit = 'Unidad(es)';
        }

        if (!consumptionMap[productVendido.id]) {
          consumptionMap[productVendido.id] = {
            name: productVendido.name,
            category: productVendido.category || 'N/A',
            unit: displayUnit,
            totalConsumed: 0,
            costImpact: 0,
            usedIn: new Set(),
            details: [],
            secondaryItemsMap: {}
          };
        }
        
        const eventName = `Venta Directa (${sale.saleMode})`;
        consumptionMap[productVendido.id].totalConsumed += equivalentUnitsConsumed;
        consumptionMap[productVendido.id].costImpact += costVal;
        consumptionMap[productVendido.id].usedIn.add(eventName);
        
        consumptionMap[productVendido.id].details.push({
          date: sale.createdAt,
          name: eventName,
          qty: detailQty,
          unit: detailUnit,
          cost: costVal
        });
      }
    });

    return {
      success: true,
      data: Object.values(consumptionMap).map(item => ({
        ...item,
        usedIn: Array.from(item.usedIn).join(', '),
        details: item.details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        secondaryItems: Object.values(item.secondaryItemsMap)
      })).sort((a, b) => b.costImpact - a.costImpact),
      
      secondaryConsumption: Object.values(globalSecondaryMap).map(sec => ({
        ...sec,
        usedInSubrecipes: Array.from(sec.usedInSubrecipes).join(', ')
      })).sort((a, b) => b.totalQty - a.totalQty)
    };
  } catch (error: any) {
    console.error("Error al generar reporte de consumo:", error);
    return { success: false, error: error.message };
  }
}

//vamos a eliminar esta funcion una vez corregido el porblema del inventario//
export async function adminBulkForceFixStock(updates: { id: string, closed: number, weight: number }[]) {
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        await tx.product.update({
          where: { id: item.id },
          data: {
            stockClosed: Number(item.closed) || 0,
            currentWeight: Number(item.weight) || 0,
          },
        });

        // Limpiamos botellas abiertas residuales para ese producto
        await tx.openBottle.deleteMany({
          where: { productId: item.id }
        });
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/supplies');
    revalidatePath('/sales');
    revalidatePath('/');

    return { success: true, message: 'Stock corregido masivamente con éxito.' };
  } catch (error: any) {
    console.error('Error al forzar corrección masiva:', error);
    return { success: false, error: error.message };
  }
}

//aqui es para almacen//
export async function adminBulkFixWarehouseStock(updates: { id: string, warehouseStock: number }[]) {
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const product = await tx.product.findUnique({ where: { id: item.id } });
        if (!product) continue;

        const previousStock = Number(product.warehouseStock || 0);
        const newStock = Number(item.warehouseStock) || 0;
        const difference = newStock - previousStock;

        // Solo actualizamos y registramos si realmente hubo un cambio
        if (difference !== 0) {
          await tx.product.update({
            where: { id: item.id },
            data: { warehouseStock: newStock },
          });

          await tx.warehouseAuditLog.create({
            data: {
              productId: product.id,
              productName: product.name,
              previousStock: previousStock,
              physicalStock: newStock,
              difference: difference,
              unitCost: product.costPrice || 0,
              totalLoss: difference * (product.costPrice || 0),
            },
          });
        }
      }
    });

    revalidatePath('/warehouse');
    return { success: true, message: 'Stock de almacén actualizado masivamente.' };
  } catch (error: any) {
    console.error('Error al actualizar almacén masivamente:', error);
    return { success: false, error: error.message };
  }
}