import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@disasterwatch/db";
import { config } from "./config.js";
export function signToken(user) {
    return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}
export async function verifyPassword(password, hash) {
    if (!hash)
        return false;
    return bcrypt.compare(password, hash);
}
export async function requireAuth(req, res, next) {
    const raw = req.headers.authorization?.replace("Bearer ", "");
    if (!raw)
        return res.status(401).json({ error: "Authentication required" });
    try {
        const decoded = jwt.verify(raw, config.jwtSecret);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, role: true }
        });
        if (!user)
            return res.status(401).json({ error: "Invalid session" });
        req.user = user;
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid session" });
    }
}
export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "Authentication required" });
        if (req.user.role !== role)
            return res.status(403).json({ error: "Insufficient permissions" });
        return next();
    };
}
