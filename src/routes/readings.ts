import { Router } from "express";
import { z } from "zod";

import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getDefaultVehicleId } from "../utils/vehicle";
import { imageMulterDisk, imageMulterMemory } from "../utils/storage";
import { extractTextFromImageBuffer } from "../services/ocrGoogle";
import { parseDashboardText } from "../services/ocrParse";

export const readingsRouter = Router();

// --- RUTA 1: OCR (Esta SIEMPRE necesita foto, porque es para leerla) ---
readingsRouter.post(
  "/ocr-preview",
  requireAuth,
  imageMulterMemory.single("image"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "missing_image" });

      const text = await extractTextFromImageBuffer(req.file.buffer);
      const parsed = parseDashboardText(text);

      return res.json({
        odometerKm: parsed.odometerKm,
        kmPerLiter: parsed.kmPerLiter,
        diagnostics: parsed.diagnostics
      });
    } catch (e) {
      console.error("🔥 ERROR REAL EN EL OCR:", e); 
      return res.status(500).json({ error: "ocr_failed" });
    }
  }
);

// --- RUTA 2: GUARDAR VIAJE  ---
readingsRouter.post(
  "/",
  requireAuth,
  imageMulterDisk.single("image"),
  async (req: AuthRequest, res) => {
    const userId = (req as any).user?.id; // Usamos el truquito de TypeScript aquí también por si acaso
    if (!userId) return res.status(401).json({ error: "missing_user" });
  
    const schema = z.object({
      odometerKm: z.coerce.number().positive(),
      kmPerLiter: z.coerce.number().positive(),
      capturedAt: z.string().optional(),
      title: z.string().optional(),
      sharedUserIds: z.string().optional() 
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "invalid_body" });

    const { odometerKm, kmPerLiter, title } = body.data;
    const capturedAt = body.data.capturedAt ? new Date(body.data.capturedAt) : new Date();
    if (Number.isNaN(capturedAt.getTime())) return res.status(400).json({ error: "invalid_capturedAt" });

    let sharedWithIds: string[] = [];
    if (body.data.sharedUserIds) {
      try {
        sharedWithIds = JSON.parse(body.data.sharedUserIds);
      } catch (e) {
        console.error("No se pudo parsear sharedUserIds:", e);
      }
    }

    const vehicleId = await getDefaultVehicleId();

    const prev = await prisma.readingPhoto.findFirst({
      where: { vehicleId, capturedAt: { lt: capturedAt } },
      orderBy: { capturedAt: "desc" }
    });

    //  Si no hay archivo, imagePath será null o un string vacío. 
    // Como en Prisma pusimos que es String (no opcional), guardaremos "NO_PHOTO"
    const finalImagePath = req.file ? req.file.path : "NO_PHOTO";

    const reading = await prisma.readingPhoto.create({
      data: {
        userId,
        vehicleId,
        imagePath: finalImagePath,
        odometerKm,
        kmPerLiter,
        capturedAt
      }
    });

    if (!prev) {
      return res.json({ readingId: reading.id, segmentCreated: false });
    }

    if (odometerKm <= Number(prev.odometerKm)) {
      return res.json({
        readingId: reading.id,
        segmentCreated: false,
        warning: "odometer_not_increasing"
      });
    }

    const kmDelta = Number(odometerKm) - Number(prev.odometerKm);
    const litrosUsed = kmDelta / Number(kmPerLiter);

    const segment = await prisma.usageSegment.create({
      data: {
        vehicleId,
        startReadingId: prev.id,
        endReadingId: reading.id,
        userId,
        capturedAt,
        kmDelta,
        litrosUsed,
        title: title || null,
        isShared: sharedWithIds.length > 0,
        sharedWith: {
          connect: sharedWithIds.map(id => ({ id })) 
        }
      }
    });

    return res.json({ readingId: reading.id, segmentCreated: true, segmentId: segment.id });
  }
);

// --- RUTA 3: OBTENER HISTORIAL ---
readingsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "missing_user" });

  const fromRaw = typeof req.query.from === "string" ? req.query.from : undefined;
  const toRaw = typeof req.query.to === "string" ? req.query.to : undefined;
  
  // Obtenemos el ID del vehículo compartido
  const vehicleId = await getDefaultVehicleId();

  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;

  const readings = await prisma.readingPhoto.findMany({
    where: {
      vehicleId,
      ...(from ? { capturedAt: { ...(to ? { lte: to } : {}), ...(from ? { gte: from } : {}) } } : {}),
      ...(to && !from ? { capturedAt: { lte: to } } : {})
    },
    orderBy: { capturedAt: "desc" },
    take: 50
  });

  return res.json({ items: readings });
});