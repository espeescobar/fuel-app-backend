import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { getDefaultVehicleId } from "../utils/vehicle";

export const fillupsRouter = Router();

fillupsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "missing_user" });

  const schema = z.object({
    liters: z.coerce.number().positive(),
    totalCost: z.coerce.number().positive(),
    filledAt: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const { liters, totalCost } = parsed.data;
  const filledAt = parsed.data.filledAt ? new Date(parsed.data.filledAt) : new Date();
  if (Number.isNaN(filledAt.getTime())) return res.status(400).json({ error: "invalid_filledAt" });

  const vehicleId = await getDefaultVehicleId();

  const pricePerLiter = Number(totalCost) / Number(liters);

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
      userId,
      ...(from ? { filledAt: { ...(to ? { lte: to } : {}), ...(from ? { gte: from } : {}) } } : {}),
      ...(to && !from ? { filledAt: { lte: to } } : {})
    },
    orderBy: { filledAt: "desc" },
    take: 50
  });

  return res.json({ items: fillUps });
});

