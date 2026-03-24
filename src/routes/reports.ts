import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getDefaultVehicleId } from "../utils/vehicle";

type ReportItem = {
  userId: string;
  userName: string;
  litersUsed: number;
  costUsed: number;
  ownCost: number;
  sharedCost: number;
  pricePerLiter: number | null;
};

function decToNumber(v: any): number {
  if (typeof v === "number") return v;
  if (v && typeof v.toNumber === "function") return v.toNumber();
  return Number(v);
}

export const reportsRouter = Router();

// ------------------------------------------------------------------
// 1. OBTENER EL REPORTE COMPLETO
// ------------------------------------------------------------------
reportsRouter.get("/usage-by-user", requireAuth, async (req: AuthRequest, res) => {
  const vehicleId = await getDefaultVehicleId();

  const schema = z.object({
    from: z.string().optional(),
    to: z.string().optional()
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "invalid_query" });

  const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return res.status(400).json({ error: "invalid_dates" });
  if (from > to) return res.status(400).json({ error: "from_must_be_before_to" });

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  const nameMap = new Map(allUsers.map(u => [u.id, u.name || u.email]));

  const fillUps = await prisma.fuelFillUp.findMany({
    where: { vehicleId, filledAt: { lte: to } },
    orderBy: { filledAt: "asc" }
  });

  const segments = await prisma.usageSegment.findMany({
    where: { vehicleId, capturedAt: { lte: to } },
    include: { sharedWith: true }, 
    orderBy: { capturedAt: "asc" }
  });

  type Event =
    | { type: "fill"; time: Date; litersAdd: number; pricePerLiter: number }
    | { type: "segment"; time: Date; userId: string; litersUsed: number; segmentId: string; sharedWithIds: string[]; title: string | null; kmDelta: number };

  const events: Event[] = [
    ...fillUps.map((f) => ({
      type: "fill" as const,
      time: f.filledAt,
      litersAdd: decToNumber(f.liters),
      pricePerLiter: decToNumber(f.pricePerLiter)
    })),
    ...segments.map((s) => ({
      type: "segment" as const,
      time: s.capturedAt,
      userId: s.userId,
      litersUsed: decToNumber(s.litrosUsed),
      segmentId: s.id,
      sharedWithIds: s.sharedWith.map(u => u.id),
      title: s.title,
      kmDelta: decToNumber(s.kmDelta)
    }))
  ];

  events.sort((a, b) => {
    const dt = a.time.getTime() - b.time.getTime();
    if (dt !== 0) return dt;
    if (a.type === b.type) return 0;
    if (a.type === "fill") return -1;
    return 1;
  });

  let litersRemaining = 0;
  let avgPricePerLiter = 0;
  const perUser = new Map<string, { liters: number; cost: number; ownCost: number; sharedCost: number; costUnknownCount: number }>();
  let missingCostSegments = 0;
  
  const trips: any[] = [];

  for (const ev of events) {
    if (ev.type === "fill") {
      const litersAdd = ev.litersAdd;
      const price = ev.pricePerLiter;
      const denom = litersRemaining + litersAdd;
      if (denom > 0) {
        avgPricePerLiter = (litersRemaining * avgPricePerLiter + litersAdd * price) / denom;
      }
      litersRemaining = denom;
      continue;
    }

    const litrosUsed = ev.litersUsed;
    const withinRange = ev.time >= from && ev.time <= to;

    if (avgPricePerLiter <= 0) {
      if (withinRange) {
        missingCostSegments += 1;
        const current = perUser.get(ev.userId) ?? { liters: 0, cost: 0, ownCost: 0, sharedCost: 0, costUnknownCount: 0 };
        current.liters += litrosUsed;
        current.costUnknownCount += 1;
        perUser.set(ev.userId, current);
        
        trips.push({
          id: ev.segmentId,
          date: ev.time,
          title: ev.title,
          driverId: ev.userId,
          sharedWithIds: ev.sharedWithIds,
          distance: ev.kmDelta,
          liters: litrosUsed,
          cost: 0
        });
      }
      continue;
    }

    litersRemaining -= litrosUsed;

    if (!withinRange) continue;

    const costUsed = litrosUsed * avgPricePerLiter;
    
    const participants = [ev.userId, ...ev.sharedWithIds];
    const uniqueParticipants = Array.from(new Set(participants)); 
    
    const splitCost = costUsed / uniqueParticipants.length;
    const splitLiters = litrosUsed / uniqueParticipants.length;
    const isSharedTrip = uniqueParticipants.length > 1;

    for (const pId of uniqueParticipants) {
      const current = perUser.get(pId) ?? { liters: 0, cost: 0, ownCost: 0, sharedCost: 0, costUnknownCount: 0 };
      current.liters += splitLiters;
      current.cost += splitCost;
      
      if (isSharedTrip) {
        current.sharedCost += splitCost;
      } else {
        current.ownCost += splitCost;
      }
      perUser.set(pId, current);
    }

    trips.push({
      id: ev.segmentId,
      date: ev.time,
      title: ev.title,
      driverId: ev.userId,
      sharedWithIds: ev.sharedWithIds,
      distance: ev.kmDelta,
      liters: litrosUsed,
      cost: costUsed
    });
  }

  const items: ReportItem[] = Array.from(perUser.entries()).map(([userId, v]) => {
    const userName = nameMap.get(userId) ?? userId;
    const pricePerLiter = v.cost > 0 ? v.cost / v.liters : null;
    return {
      userId,
      userName,
      litersUsed: v.liters,
      costUsed: v.cost,
      ownCost: v.ownCost,
      sharedCost: v.sharedCost,
      pricePerLiter
    };
  });

  const formattedTrips = trips.map(t => ({
    id: t.id,
    date: t.date,
    title: t.title || "Viaje sin nombre",
    driverName: nameMap.get(t.driverId) || "Desconocido",
    sharedWithNames: t.sharedWithIds.map((id: string) => nameMap.get(id) || "Desconocido"),
    distance: t.distance,
    liters: t.liters,
    cost: t.cost
  })).reverse(); 
  
  const warnings: string[] = [];
  if (missingCostSegments > 0) {
    warnings.push(`Hay ${missingCostSegments} segmentos sin costo calculable (probablemente faltan cargas antes de las fechas).`);
  }

  return res.json({ 
    from, 
    to, 
    items, 
    trips: formattedTrips, 
    warnings,
    currentLitersRemaining: litersRemaining,
    currentAveragePrice: avgPricePerLiter
  });
}); // <--- AQUÍ CERRAMOS EL GET CORRECTAMENTE. ¡LO QUE SIGUE VA AFUERA!


// ------------------------------------------------------------------
// 2. RUTAS PARA ELIMINAR REGISTROS
// ------------------------------------------------------------------

// Eliminar un viaje (UsageSegment) y su odómetro
reportsRouter.delete("/delete-trip/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const segmentId = req.params.id;

    // 1. Buscamos el viaje ANTES de borrarlo para saber cuál es su "endReadingId" (el odómetro final)
    const segment = await prisma.usageSegment.findUnique({
      where: { id: segmentId }
    });

    if (!segment) {
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    // 2. Borramos el viaje (UsageSegment)
    await prisma.usageSegment.delete({ 
      where: { id: segmentId } 
    });

    // 3. Borramos la lectura del odómetro asociada a ese viaje (ReadingPhoto)
    // ¡ESTO es lo que hace que el kilometraje baje en tu app!
    await prisma.readingPhoto.delete({
      where: { id: segment.endReadingId }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error borrando viaje:", error);
    return res.status(500).json({ error: "No se pudo eliminar el viaje" });
  }
});