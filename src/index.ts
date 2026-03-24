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

// Carga las variables de entorno
dotenv.config();

const app = express();

// 1. EL CORS "NUCLEAR"
app.use(cors({
  origin: ['https://fuel-app-frontend-one.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.options('*', cors());

// 2. HELMET CORREGIDO (El salvavidas)
// Le decimos a Helmet que permita que otros orígenes lean nuestra API
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 3. PARSEO DE JSON (Una sola vez)
app.use(express.json({ limit: "1mb" }));

// 4. RUTA DE SALUD (Para saber si el server está vivo)
app.get("/health", (_req, res) => res.json({ ok: true }));

// 5. RUTAS DE TUS CARPETAS
app.use("/api/auth", authRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/fill-ups", fillupsRouter);
app.use("/api/reports", reportsRouter);

// Usamos el router que importaste arriba para los viajes estándar
app.use("/api/standard-trips", standardTripsRouter);

// 6. RUTAS MANUALES
// Endpoint para obtener los usuarios (para el select de compartir)
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

// 7. MANEJO DE ERRORES GENERALES
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.message === "invalid_file_type") return res.status(400).json({ error: "invalid_file_type" });
  return res.status(500).json({ error: "server_error" });
});

// 8. ENCENDIDO DEL SERVIDOR
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`fuel-app backend listening on :${port}`);
});