import type { Request, Response } from "express";
import { findPath } from "../../services/PathfindingService";

interface RouteRequestBody {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
}

/**
 * POST /api/route
 * Find optimal path between two points, avoiding high-penalty areas
 */
export async function calculateRoute(req: Request, res: Response) {
    try {
        const { start, end } = req.body as RouteRequestBody;

        // Validate request
        if (!start || !end) {
            return res.status(400).json({ error: "start and end coordinates required" });
        }

        if (typeof start.lat !== "number" || typeof start.lng !== "number") {
            return res.status(400).json({ error: "Invalid start coordinates" });
        }

        if (typeof end.lat !== "number" || typeof end.lng !== "number") {
            return res.status(400).json({ error: "Invalid end coordinates" });
        }

        // Find path using A* algorithm
        const result = await findPath(start.lat, start.lng, end.lat, end.lng);

        if (!result) {
            return res.status(404).json({
                error: "No route found",
                message: "Could not find a path between the specified points. The area may not have road data loaded.",
            });
        }

        return res.json({
            path: result.path,
            totalDistance: Math.round(result.totalDistance), // in meters
            estimatedTime: Math.round(result.estimatedTime), // in minutes
        });
    } catch (err) {
        console.error("Error calculating route:", err);
        return res.status(500).json({ error: "Failed to calculate route" });
    }
}

export default { calculateRoute };
