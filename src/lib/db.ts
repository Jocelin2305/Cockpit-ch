import { PrismaClient } from "@prisma/client";

// Une seule instance, même quand le serveur de développement recharge le code.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
