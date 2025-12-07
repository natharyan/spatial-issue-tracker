import express from "express";
import { calculateRoute } from "../controllers/routeController";
import { optionalAuth } from "../middleware/auth";

const router = express.Router();

// POST /api/route - Find optimal path between two points
router.post("/", optionalAuth, calculateRoute);

export default router;
