import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { requireAuth } from "./middleware/auth";
import { prisma } from "./prisma";

import { authRouter } from "./routes/auth";
import { readingsRouter } from "./routes/readings";
import { fillupsRouter } from "./routes/fillups";
import { reportsRouter } from "./routes/reports";
import { standardTripsRouter } from "./routes/standardTrips"; 



dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/fill-ups", fillupsRouter);
app.use("/api/reports", reportsRouter);

app.use("/api/standard-trips", standardTripsRouter);


// 1. Endpoint para obtener los usuarios (para el select de compartir)
app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    });
    res.json({ items: users });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// 2. Endpoint para obtener los viajes frecuentes
app.get("/api/standard-trips", requireAuth, async (req, res) => {
  try {
    const trips = await prisma.standardTrip.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ items: trips });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener viajes estándar" });
  }
});

// Manejo de errores (ej: errores de multer/validaciones)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.message === "invalid_file_type") return res.status(400).json({ error: "invalid_file_type" });
  return res.status(500).json({ error: "server_error" });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`fuel-app backend listening on :${port}`);
});

