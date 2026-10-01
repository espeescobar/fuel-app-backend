import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { getDefaultVehicleId } from "../utils/vehicle";
import {
  parseLiters,
  parseMoney,
  PRICE_PER_LITER_MAX,
  PRICE_PER_LITER_MIN
} from "../utils/parseNumber";

export const fillupsRouter = Router();

fillupsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "missing_user" });

  const schema = z.object({
    liters: z.unknown(),
    totalCost: z.unknown(),
    filledAt: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const liters = parseLiters(parsed.data.liters);
  const totalCost = parseMoney(parsed.data.totalCost);
  if (liters === null || totalCost === null) {
    return res.status(400).json({
      error: "Revisa litros y costo total. En Chile 42.000 son 42000 pesos (el punto es de miles)."
    });
  }

  const filledAt = parsed.data.filledAt ? new Date(parsed.data.filledAt) : new Date();
  if (Number.isNaN(filledAt.getTime())) return res.status(400).json({ error: "invalid_filledAt" });

  const vehicleId = await getDefaultVehicleId();

  const pricePerLiter = totalCost / liters;
  if (pricePerLiter < PRICE_PER_LITER_MIN || pricePerLiter > PRICE_PER_LITER_MAX) {
    return res.status(400).json({
      error: `El precio por litro quedaría en $${pricePerLiter.toFixed(0)}, lo que no parece real. Si el total era $42.000, escríbelo como 42000 o 42.000.`
    });
  }

  const fillUp = await prisma.fuelFillUp.create({
    data: {
      vehicleId,
      userId,
      filledAt,
      liters,
      totalCost,
      pricePerLiter
    }
  });

  return res.json({ id: fillUp.id });
});

fillupsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  // Ya no necesitamos el userId para filtrar, pero validamos que el usuario exista
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "missing_user" });

  const fromRaw = typeof req.query.from === "string" ? req.query.from : undefined;
  const toRaw = typeof req.query.to === "string" ? req.query.to : undefined;

  const vehicleId = await getDefaultVehicleId();
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;

  const fillUps = await prisma.fuelFillUp.findMany({
    where: {
      vehicleId,
      ...(from ? { filledAt: { ...(to ? { lte: to } : {}), ...(from ? { gte: from } : {}) } } : {}),
      ...(to && !from ? { filledAt: { lte: to } } : {})
    },
    orderBy: { filledAt: "desc" },
    take: 100
  });

  return res.json({ items: fillUps });
});

fillupsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "missing_user" });

  const id = req.params.id;
  const existing = await prisma.fuelFillUp.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Carga no encontrada" });

  await prisma.fuelFillUp.delete({ where: { id } });
  return res.json({ success: true });
});