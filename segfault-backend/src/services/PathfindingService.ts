/**
 * Pathfinding Service
 * Implements A* algorithm for finding optimal routes through the road network,
 * considering edge penalties from reported issues.
 */

import TinyQueue from "tinyqueue";
import * as turf from "@turf/turf";
import { prisma } from "../data/prisma/prismaClient";

interface PathNode {
    id: string;
    latitude: number;
    longitude: number;
}

interface PathEdge {
    id: string;
    startNodeId: string;
    endNodeId: string;
    distance: number;
    baseCost: number;
    penalty: number;
}

interface QueueItem {
    nodeId: string;
    fScore: number;
}

interface PathResult {
    path: Array<{ lat: number; lng: number }>;
    totalDistance: number;
    totalCost: number;
    estimatedTime: number; // in minutes, assuming average 30 km/h
}

/**
 * Calculates Euclidean distance between two points (heuristic for A*)
 */
function heuristic(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    return turf.distance(from, to, { units: "meters" });
}

/**
 * Finds the nearest GraphNode to given coordinates
 */
async function findNearestNode(lat: number, lng: number): Promise<PathNode | null> {
    // Search within a small radius first, expand if needed
    const searchRadii = [0.001, 0.005, 0.01, 0.05];

    for (const radius of searchRadii) {
        const nodes = await prisma.graphNode.findMany({
            where: {
                latitude: { gte: lat - radius, lte: lat + radius },
                longitude: { gte: lng - radius, lte: lng + radius },
            },
            select: { id: true, latitude: true, longitude: true },
        });

        if (nodes.length > 0) {
            // Find the closest one
            let closest: PathNode | null = null;
            let minDist = Infinity;

            for (const node of nodes) {
                const dist = heuristic(lat, lng, node.latitude, node.longitude);
                if (dist < minDist) {
                    minDist = dist;
                    closest = node;
                }
            }

            return closest;
        }
    }

    return null;
}

/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(
    edges: PathEdge[]
): Map<string, Array<{ nodeId: string; cost: number; distance: number; edgeId: string }>> {
    const adj = new Map<string, Array<{ nodeId: string; cost: number; distance: number; edgeId: string }>>();

    for (const edge of edges) {
        if (!adj.has(edge.startNodeId)) {
            adj.set(edge.startNodeId, []);
        }
        // FIX: Use penalty of 1 as default when penalty is 0 (no penalty applied yet)
        const penalty = edge.penalty === 0 ? 1 : edge.penalty;
        adj.get(edge.startNodeId)!.push({
            nodeId: edge.endNodeId,
            cost: edge.distance * penalty,
            distance: edge.distance,
            edgeId: edge.id,
        });
    }

    return adj;
}

/**
 * A* pathfinding algorithm
 */
export async function findPath(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<PathResult | null> {
    console.log(`Finding path from (${startLat}, ${startLng}) to (${endLat}, ${endLng})`);

    // Step 1: Snap to nearest nodes
    const startNode = await findNearestNode(startLat, startLng);
    const endNode = await findNearestNode(endLat, endLng);

    if (!startNode || !endNode) {
        console.log("Could not find start or end node in graph");
        return null;
    }

    console.log(`Start node: ${startNode.id}, End node: ${endNode.id}`);

    // Step 2: Load graph into memory
    const [allNodes, allEdges] = await Promise.all([
        prisma.graphNode.findMany({
            select: { id: true, latitude: true, longitude: true },
        }),
        prisma.graphEdge.findMany({
            select: { id: true, startNodeId: true, endNodeId: true, distance: true, baseCost: true, penalty: true },
        }),
    ]);

    console.log(`Loaded ${allNodes.length} nodes and ${allEdges.length} edges`);

    // Build node lookup
    const nodeMap = new Map<string, PathNode>();
    for (const node of allNodes) {
        nodeMap.set(node.id, node);
    }

    // Build adjacency list
    const adjacency = buildAdjacencyList(allEdges);

    // Step 3: A* Algorithm
    const openSet = new TinyQueue<QueueItem>([{ nodeId: startNode.id, fScore: 0 }], (a, b) => a.fScore - b.fScore);

    const gScore = new Map<string, number>();
    const cameFrom = new Map<string, string>();
    const distanceFrom = new Map<string, number>();

    gScore.set(startNode.id, 0);
    distanceFrom.set(startNode.id, 0);

    const visited = new Set<string>();

    while (openSet.length > 0) {
        const current = openSet.pop()!;

        if (current.nodeId === endNode.id) {
            // Reconstruct path
            const path: Array<{ lat: number; lng: number }> = [];
            let nodeId: string | undefined = endNode.id;
            // FIX: Use ?? instead of || to handle 0 correctly
            let totalDistance = distanceFrom.get(endNode.id) ?? 0;
            let totalCost = gScore.get(endNode.id) ?? 0;

            while (nodeId) {
                const node = nodeMap.get(nodeId);
                if (node) {
                    path.unshift({ lat: node.latitude, lng: node.longitude });
                }
                nodeId = cameFrom.get(nodeId);
            }

            // Estimated time at 30 km/h average
            const estimatedTime = (totalDistance / 1000 / 30) * 60;

            console.log(`Path found! ${path.length} nodes, ${totalDistance.toFixed(0)}m, ${estimatedTime.toFixed(1)}min`);

            return {
                path,
                totalDistance,
                totalCost,
                estimatedTime,
            };
        }

        if (visited.has(current.nodeId)) continue;
        visited.add(current.nodeId);

        const neighbors = adjacency.get(current.nodeId) || [];

        for (const neighbor of neighbors) {
            // FIX: Use ?? instead of || to handle gScore of 0 correctly
            const currentG = gScore.get(current.nodeId) ?? Infinity;
            const tentativeGScore = currentG + neighbor.cost;
            const tentativeDistance = (distanceFrom.get(current.nodeId) ?? 0) + neighbor.distance;

            // FIX: Use ?? instead of || to handle gScore of 0 correctly
            const neighborG = gScore.get(neighbor.nodeId) ?? Infinity;

            if (tentativeGScore < neighborG) {
                cameFrom.set(neighbor.nodeId, current.nodeId);
                gScore.set(neighbor.nodeId, tentativeGScore);
                distanceFrom.set(neighbor.nodeId, tentativeDistance);

                const neighborNode = nodeMap.get(neighbor.nodeId);
                if (neighborNode) {
                    const h = heuristic(neighborNode.latitude, neighborNode.longitude, endNode.latitude, endNode.longitude);
                    openSet.push({
                        nodeId: neighbor.nodeId,
                        fScore: tentativeGScore + h,
                    });
                }
            }
        }
    }

    console.log(`No path found after visiting ${visited.size} nodes`);
    return null;
}

export default { findPath };
