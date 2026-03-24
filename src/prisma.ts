import { PrismaClient } from "@prisma/client";

// Mantiene una sola instancia del cliente Prisma durante el runtime (evita conexiones duplicadas en dev).
export const prisma = new PrismaClient();

