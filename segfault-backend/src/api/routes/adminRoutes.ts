import { Router } from "express";
import { getModerationQueue, resolveModeration, getUsers, banUser } from "../controllers/adminController";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

// Admin role check middleware
const isAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};

// All routes require auth + admin
router.use(authMiddleware);
router.use(isAdmin);

// Moderation
router.get("/moderation", getModerationQueue);
router.post("/moderation/:id/resolve", resolveModeration);

// User management
router.get("/users", getUsers);
router.post("/users/:id/ban", banUser);

export default router;
