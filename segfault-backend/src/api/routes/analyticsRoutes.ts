import express from "express";
import { getSummary, getHeatmap, exportData } from "../controllers/analyticsController";
import { authMiddleware, optionalAuth } from "../middleware/auth";

const router = express.Router();

router.get("/summary", optionalAuth, getSummary);
router.get("/heatmap", getHeatmap);
router.get("/export", authMiddleware, exportData);

export default router;
