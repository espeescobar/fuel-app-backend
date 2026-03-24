import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type AuthRequest = Request & {
  user?: AuthenticatedUser;
};

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & { sub?: string; email?: string };
    if (!payload.sub || !payload.email) return res.status(401).json({ error: "invalid_token" });
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

