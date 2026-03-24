import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { getDefaultVehicleId } from "../utils/vehicle";

export const standardTripsRouter = Router();

// GET: Obtener todos los viajes frecuentes
standardTripsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const vehicleId = await getDefaultVehicleId();
    const items = await prisma.standardTrip.findMany({
      where: { vehicleId },
      orderBy: { name: "asc" }
    });
    return res.json({ items: items.map(t => ({ ...t, distanceKm: Number(t.distanceKm) })) });
  } catch (error) {
    return res.status(500).json({ error: "Error obteniendo viajes estándar" });
  }
});

// POST: Crear un nuevo viaje frecuente
standardTripsRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    distanceKm: z.number().positive()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  try {
    const vehicleId = await getDefaultVehicleId();
    const trip = await prisma.standardTrip.create({
      data: {
        name: parsed.data.name,
        distanceKm: parsed.data.distanceKm,
        vehicleId
      }
    });
    return res.json({ id: trip.id });
  } catch (error) {
    return res.status(500).json({ error: "Error creando viaje estándar" });
  }
});