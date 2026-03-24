import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { getDefaultVehicleId } from "../utils/vehicle";

export const authRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post("/register", async (req, res) => {
  const body = RegisterSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_body" });

  const { email, password, name } = body.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "email_already_registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN ?? "7d"
  });

  return res.json({ token });
});

authRouter.post("/login", async (req, res) => {
  const body = LoginSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_body" });

  const { email, password } = body.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN ?? "7d"
  });

  return res.json({ token });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "missing_user" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: "invalid_user" });

  const vehicleId = await getDefaultVehicleId();

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    vehicleId
  });
});

