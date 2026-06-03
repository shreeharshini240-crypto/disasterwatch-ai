import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { prisma, Role, type User } from "@disasterwatch/db";
import { config } from "./config.js";

export type AuthUser = Pick<User, "id" | "email" | "name" | "role">;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash?: string | null) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers.authorization?.replace("Bearer ", "");
  if (!raw) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = jwt.verify(raw, config.jwtSecret) as AuthUser;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true }
    });
    if (!user) return res.status(401).json({ error: "Invalid session" });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (req.user.role !== role) return res.status(403).json({ error: "Insufficient permissions" });
    return next();
  };
}
