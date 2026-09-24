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

    // CANDADO 1: Obtenemos los nombres actuales para verificar duplicados
    const existingProducts = await prisma.product.findMany({
      select: { name: true }
    });
    
    // Comprobamos si el nombre ya existe (ignorando mayúsculas/minúsculas)
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
        minStock: parseFloat(data.minStock) || 1, // <-- AGREGADO
        maxStock: parseFloat(data.maxStock) || 10, // <-- AGREGADO
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
        minStock: parseFloat(data.minStock) || 1, // <-- AGREGADO
        maxStock: parseFloat(data.maxStock) || 10, // <-- AGREGADO
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
// GESTIÓN DE VENTAS Y DESCUENTO DE INVENTARIO
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

    // 1. OBTENER MILILITROS REALES SEGÚN EL MÉTODO DE MEDICIÓN
    if (method === 'PORTION') {
      netOpenMl = currentWeight * pCap;
    } else {
      if (currentWeight > tare) {
        netOpenMl = currentWeight - tare;
      }
    }

    // 2. CALCULAR GLOBAL Y RESTAR
    let totalMlGlobal = (stockClosed * pCap) + netOpenMl;
    totalMlGlobal = totalMlGlobal - totalDeductionMl;

    // 3. REDISTRIBUIR
    let newClosedUnits = 0;
    let remainderMl = 0;

    if (totalMlGlobal >= 0) {
      newClosedUnits = Math.floor(totalMlGlobal / pCap);
      remainderMl = totalMlGlobal % pCap;
    } else {
      newClosedUnits = 0;
      remainderMl = totalMlGlobal; 
    }

    // 4. VOLVER A GUARDAR
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

  } else {
    // --- AQUÍ EMPIEZA LA MAGIA DEL TRADUCTOR DE UNIDADES ---
    let currentStockClosed = Number(product.stockClosed || 0);
    let currentWeight = Number(product.currentWeight || 0);
    const capacity = Number(product.capacity || 1); 
    const unit = (product.unit || 'pz').toLowerCase();

    // La cantidad que manda la receta (ej. 150 de limonada o 1 pza de café)
    let deduction = totalDeductionMl; 

    // 1. CONVERSIÓN INVISIBLE A LITROS O KILOS
    if (unit === 'lt' || unit === 'kg') {
      deduction = deduction / 1000; // Convierte 150 a 0.15
    }

    const isStrictPiece = [
      'refresco', 'agua', 'coca', 'cafe', 'cápsula', 'capsula', 'lata', 'cerveza', 'jugo', 'mix', 'bebidas'
    ].some((term) => catLower.includes(term) || (product.name || '').toLowerCase().includes(term));

    // 2. APLICAR DESCUENTO CON EFECTO CASCADA (ABRIR BOTELLA AUTOMÁTICAMENTE)
    if (unit === 'lt' || unit === 'kg') {
      // Si la botella abierta no tiene suficiente líquido, abrimos una nueva
      if (currentWeight < deduction && currentStockClosed > 0) {
        currentStockClosed -= 1;          // Quitamos 1 botella del stock cerrado
        currentWeight += capacity;        // "Servimos" toda la capacidad (ej. 2 lt) a la abierta
      }
      currentWeight = currentWeight - deduction; // Hacemos la resta matemática (ej. 2 - 0.15 = 1.85)
    } 
    else if (isStrictPiece && unit === 'pz') {
      // Lógica para piezas enteras reales (Cápsulas de café, lata de coca, cerveza)
      currentStockClosed = currentStockClosed - deduction; 
    } 
    else {
      // Lógica para insumos dados de alta en "ml" o "g" puros (jarabes, pulpas)
      currentWeight = currentWeight - deduction;
    }

    await tx.product.update({
      where: { id: product.id },
      data: {
        stockClosed: currentStockClosed,
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

        // Costo unitario de preparar UNA sola receta
        const unitCost = recipe.items.reduce((acc: number, item: any) => {
          if (!item.product) return acc;
          const pCost = Number(item.product.costPrice || 0);
          const pCap = Number(item.product.capacity || 1);
          const pUnit = (item.product.unit || 'ml').toLowerCase();
          const ingQty = Number(item.quantity || 0);

          let costPerItemUnit = 0;

          if (pUnit === 'kg' || pUnit === 'kilo') {
            costPerItemUnit = (pCost / 1000) * ingQty;
          } else if (pUnit === 'lt' || pUnit === 'lts' || pUnit === 'litros') {
            costPerItemUnit = (pCost / 1000) * ingQty;
          } else if (pCap > 1) {
            costPerItemUnit = (pCost / pCap) * ingQty;
          } else {
            costPerItemUnit = pCost * ingQty;
          }

          return acc + costPerItemUnit;
        }, 0);

        // Guardamos el costo total y precio total de la venta de forma limpia
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
          // VENTA POR PIEZA / LATA / BOTELLA CERRADA (Ej. Cervezas, Aguas)
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
          // VENTA DE BOTELLA ENTERA
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
          // VENTA POR COPEO (Licores y Vinos)
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

    // CANDADO 2: Cargamos nombres existentes de la Base de Datos
    const existingProductsDb = await prisma.product.findMany({
      select: { name: true }
    });
    // Creamos un registro rápido de nombres en minúsculas para comparar
    const existingNames = new Set(existingProductsDb.map(p => p.name.toLowerCase().trim()));

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const rawName = row['Nombre'] || row['nombre'] || row['PRODUCTO'] || row['Name'];
      if (!rawName) continue;

      const cleanName = String(rawName).trim();

      // Si el producto ya existe, saltamos a la siguiente fila para no duplicar
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
      
      // Añadimos el recién creado al registro para que no se duplique si viene 2 veces en el mismo Excel
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

      // Misma lógica de cálculo proporcional que usas en el inventario visual
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

      // Equivalente total en unidades (ej: 1.5)
      // Equivalente total en unidades (ej: 1.5)
      const totalUnitsEquivalent = stockClosed + openRatio;

      const totalValue = (stockClosed * cost) + (openRatio * cost);

      return {
        'Producto': p.name,
        'Categoría': p.category,
        'Subtipo / Región': p.subtype || 'N/D',
        'Stock Total (Unidades)': Number(totalUnitsEquivalent.toFixed(2)), // <-- AQUÍ MUESTRA EL DECIMAL (Ej: 1.5)
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

// ==========================================
// GESTIÓN DE ZONAS DINÁMICAS DE INVENTARIO
// ==========================================
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
    // Ajusta la ruta si tu página se llama diferente
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

// ==========================================
// MÓDULO DE PRODUCCIÓN (BATEO DE JARABES)
// ==========================================
export async function getProductionRecipes() {
  try {
    // Traemos TODAS las recetas sin filtros restrictivos para que aparezcan pulpas, infusiones, jarabes, etc.
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
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { items: true }
    });
    
    if (!recipe) throw new Error('Receta no encontrada');

    // Buscar el producto en el inventario que corresponde a este jarabe
    // (Busca si se llama igual, o si tiene el prefijo "[Subreceta]")
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

    // Ejecutamos todo en una transacción para que si algo falla, no se descuadre nada
    await prisma.$transaction(async (tx) => {
      // 1. Sumar el rendimiento al jarabe final en el inventario
      if (targetProduct) {
         const amountToAdd = recipe.yieldQuantity * batches;
         await tx.product.update({
           where: { id: targetProduct.id },
           data: { currentWeight: { increment: amountToAdd } }
         });
      }

      // 2. Descontar las cantidades de los insumos utilizados (ej. Azúcar, Limón)
      for (const item of recipe.items) {
         const amountToDeduct = item.quantity * batches;
         await tx.product.update({
           where: { id: item.productId },
           data: { currentWeight: { decrement: amountToDeduct } }
         });
      }
    });

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

  // Metemos todo en una transacción para proteger la base de datos
  await prisma.$transaction(async (tx) => {
    
    // 1. REINTEGRAR INVENTARIO
    if (sale.recipeId && sale.recipe) {
      // Es un Cóctel: Devolvemos los insumos usando la función matemática en negativo (para que sume y reempaquete)
      for (const item of sale.recipe.items) {
        if (!item.product) continue;
        const mlReturned = (item.quantity || 0) * sale.quantity;
        // Mandamos el valor en negativo para invertir la deducción
        await applyInventoryDeduction(tx, item.product, -mlReturned);
      }
    } else if (sale.productId && sale.product) {
      // Es un Producto Directo
      const catLower = (sale.product.category || '').toLowerCase();
      const isStrictPiece = [
        'mezclador', 'mezcladores', 'refresco', 'agua', 'cerveza', 'cafe', 'café', 'pieza',
        'mocktail', 'mixologia', 'mixología', 'cocteleria', 'coctelería'
      ].some((cat) => catLower.includes(cat));

      if (isStrictPiece || sale.saleMode === 'PIEZA' || sale.saleMode === 'BOTELLA') {
        // Si es pieza entera o botella cerrada, devolvemos la unidad directamente al stock cerrado
        const currentClosed = Number(sale.product.stockClosed || 0);
        await tx.product.update({
          where: { id: sale.productId },
          data: { stockClosed: currentClosed + sale.quantity },
        });
      } else {
        // Es Copeo (Vinos / Licores)
        const isWineOrEspumoso = [
          'vinos', 'vino', 'tinto', 'blanco', 'rosado', 'espumoso', 'champagne', 'cava'
        ].some((c) => catLower.includes(c));
        
        const mlPerPortion = isWineOrEspumoso ? 150 : 45; 
        const mlReturned = mlPerPortion * sale.quantity;
        
        // Devolvemos los ml al stock abierto usando la función inversa
        await applyInventoryDeduction(tx, sale.product, -mlReturned);
      }
    }

    // 2. ELIMINAR EL REGISTRO DE VENTA
    await tx.sale.delete({
      where: { id: saleId },
    });
  });

  revalidatePath('/inventory');
  revalidatePath('/sales');
  revalidatePath('/');

  return { success: true };
}

// ==========================================
// MÓDULO DE REQUISICIONES / TRASPASOS
// ==========================================

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

export async function confirmRequisitionOrder(orderId: string, deliveredItems: { itemId: string; quantityDelivered: number }[]) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Cambiar el estado de la orden a COMPLETED
      await tx.requisitionOrder.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' },
      });

      for (const item of deliveredItems) {
        // Actualizar la cantidad entregada en el ítem de la requisición
        await tx.requisitionItem.update({
          where: { id: item.itemId },
          data: { quantityDelivered: item.quantityDelivered },
        });

        // Buscar el ítem con su producto asociado
        const reqItem = await tx.requisitionItem.findUnique({
          where: { id: item.itemId },
          include: { product: true },
        });

        if (reqItem && reqItem.product) {
          const qtyDelivered = Number(item.quantityDelivered || 0);
          
          const currentBarStock = Number(reqItem.product.stockClosed || 0);
          const currentWarehouseStock = Number(reqItem.product.warehouseStock || 0);

          // 2. Actualizar: Sumar a Barra (stockClosed) y RESTAR de Almacén (warehouseStock)
          await tx.product.update({
            where: { id: reqItem.productId },
            data: { 
              stockClosed: currentBarStock + qtyDelivered,
              warehouseStock: Math.max(0, currentWarehouseStock - qtyDelivered),
            },
          });
        }
      }
    });

    revalidatePath('/requisitions');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');
    return { success: true, message: 'Requisición confirmada e inventario actualizado con éxito.' };
  } catch (error: any) {
    console.error('Error al confirmar requisición:', error);
    return { success: false, error: error.message || 'Error al procesar la entrega' };
  }
}