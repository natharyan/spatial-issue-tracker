import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT } from "../../appconfig";
import { prisma } from "../../data/prisma/prismaClient";

export interface AuthUser {
    id: number;
    role: "USER" | "ADMIN" | "GUEST" | "PIGS";
    email?: string;
    guestTokenId?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.session || req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const decoded = jwt.verify(token, JWT.SECRET) as { sub?: string; id?: number; userId?: number; role?: string; guestTokenId?: number };

        if (decoded.guestTokenId) {
            const guestToken = await prisma.guestToken.findUnique({ where: { id: decoded.guestTokenId } });
            if (!guestToken) {
                return res.status(401).json({ error: "Invalid guest session" });
            }
            req.user = {
                id: -1,
                role: "GUEST",
                guestTokenId: decoded.guestTokenId,
            };
        } else {
            const userId = decoded.userId || decoded.id || (decoded.sub ? parseInt(decoded.sub) : undefined);
            if (!userId) {
                return res.status(401).json({ error: "Invalid token" });
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return res.status(401).json({ error: "User not found" });
            }

            req.user = {
                id: user.id,
                role: user.role as "USER" | "ADMIN",
                email: user.email,
            };
        }

        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.session || req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, JWT.SECRET) as { sub?: string; id?: number; userId?: number; role?: string; guestTokenId?: number };

        if (decoded.guestTokenId) {
            req.user = {
                id: -1,
                role: "GUEST",
                guestTokenId: decoded.guestTokenId,
            };
        } else {
            const userId = decoded.userId || decoded.id || (decoded.sub ? parseInt(decoded.sub) : undefined);
            if (userId) {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (user) {
                    req.user = {
                        id: user.id,
                        role: user.role as "USER" | "ADMIN",
                        email: user.email,
                    };
                }
            }
        }

        next();
    } catch {
        next();
    }
}

export default { authMiddleware, optionalAuth };
