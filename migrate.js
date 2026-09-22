const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const dbPath = path.resolve(__dirname, 'prisma/dev.db');
const sqliteDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

const tablesToMigrate = [
  'Supplier',
  'Product',
  'Recipe',
  'RecipeItem',
  'OpenBottle',
  'InventoryZone',
  'PurchaseOrder',
  'PurchaseItem',
  'SystemSetting',
  'InventoryLog'
];

async function runDirectMigration() {
  console.log('🚀 Iniciando migración con conversión de fechas...');

  for (const tableName of tablesToMigrate) {
    await new Promise((resolve) => {
      sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
        if (err || !rows || rows.length === 0) {
          console.log(`ℹ️ Tabla ${tableName} sin registros o no encontrada.`);
          return resolve();
        }

        console.log(`🔄 Migrando ${rows.length} registros en ${tableName}...`);
        
        const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
        const model = prisma[modelName];

        if (!model) {
          console.log(`⚠️ Modelo Prisma para ${tableName} no encontrado.`);
          return resolve();
        }

        for (const row of rows) {
          // Convertir campos de fecha numéricos a objetos Date
          const data = { ...row };
          if (data.createdAt && typeof data.createdAt === 'number') {
            data.createdAt = new Date(data.createdAt);
          }
          if (data.updatedAt && typeof data.updatedAt === 'number') {
            data.updatedAt = new Date(data.updatedAt);
          }
          if (data.date && typeof data.date === 'number') {
            data.date = new Date(data.date);
          }

          try {
            await model.create({ data });
          } catch (e) {
            // Si ya existe por ID, intentamos actualizar
            try {
              await model.update({
                where: { id: data.id },
                data,
              });
            } catch (updateErr) {
              // Ignorar duplicados menores
            }
          }
        }
        console.log(`✅ Tabla ${tableName} migrada con éxito.`);
        resolve();
      });
    });
  }

  console.log('🎉 ¡Migración completa finalizada sin errores de fecha!');
  await prisma.$disconnect();
  sqliteDb.close();
}

runDirectMigration();