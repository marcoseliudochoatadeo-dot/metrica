import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.epozwiakwvlebxxtjdzc:8hFF3K56m1OnhDWb@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
      },
    },
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;