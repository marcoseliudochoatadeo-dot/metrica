// app/api/inventory/logs/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let whereClause: any = {};

    if (startDateParam || endDateParam) {
      whereClause.createdAt = {};
      if (startDateParam) {
        whereClause.createdAt.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        whereClause.createdAt.lte = new Date(endDateParam);
      }
    }

    const logs = await prisma.inventoryLog.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true,
            category: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200, // Límite de seguridad para rendimiento
    });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo logs de inventario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}