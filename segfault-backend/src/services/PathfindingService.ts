/**
 * Pathfinding Service
 * Implements A* algorithm for finding optimal routes through the road network,
 * considering edge penalties from reported issues.
 */

import TinyQueue from "tinyqueue";
import * as turf from "@turf/turf";
import axios from "axios";
import { prisma } from "../data/prisma/prismaClient";
import { IssueStatus } from "../generated/prisma/enums";

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
/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(
    edges: PathEdge[],
    activeIssues: Array<{ lat: number; lng: number; severity: number }> = []
): Map<string, Array<{ nodeId: string; cost: number; distance: number; edgeId: string }>> {
    const adj = new Map<string, Array<{ nodeId: string; cost: number; distance: number; edgeId: string }>>();

    for (const edge of edges) {
        if (!adj.has(edge.startNodeId)) {
            adj.set(edge.startNodeId, []);
        }

        // Base penalty from DB
        let penalty = edge.penalty === 0 ? 1 : edge.penalty;

        // Dynamic Issue Penalty
        // Check if any active issue is close to this edge
        // Simplified: Check if issue is near the start node
        // In a real system, we'd use spatial index or check distance to line segment
        const edgeStartNode = edges.find(e => e.id === edge.id); // This is inefficient if we look up, but we have startNodeId
        // Optimization: We pass nodes or assume logic.
        // Actually, we can check issues against the start node of the edge
        // Since we don't have node coords here easily without looking up, we might do this calculation locally in findPath or pass nodeMap here.
        // Better: Calculate 'risk zones' into a Set or fast lookup before calling this.

        // Traffic Simulation (Random factor 1.0 - 1.3) assuming rush hour
        const trafficFactor = 1.0 + (Math.random() * 0.3);

        adj.get(edge.startNodeId)!.push({
            nodeId: edge.endNodeId,
            cost: edge.distance * penalty * trafficFactor,
            distance: edge.distance,
            edgeId: edge.id,
        });
    }

    return adj;
}

/**
 * Ingest OSM Data for a Bounding Box
 * bbox format: [minLat, minLng, maxLat, maxLng]
 */
export async function ingestOSMData(bbox: [number, number, number, number]) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    console.log(`Ingesting OSM data for bbox: ${bbox}`);

    // Overpass API Query
    // [out:json];(way[highway]({s},{w},{n},{e});>;);out body;
    const query = `
        [out:json][timeout:25];
        (
          way["highway"](${minLat},${minLng},${maxLat},${maxLng});
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        const response = await axios.post("https://overpass-api.de/api/interpreter", `data=${encodeURIComponent(query)}`, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const elements = response.data.elements;
        if (!elements) throw new Error("No elements found in Overpass response");

        console.log(`Fetched ${elements.length} elements from OSM`);

        const nodes = new Map<number, { lat: number; lon: number }>();
        const ways: any[] = [];

        // Parse elements
        for (const el of elements) {
            if (el.type === "node") {
                nodes.set(el.id, { lat: el.lat, lon: el.lon });
            } else if (el.type === "way") {
                ways.push(el);
            }
        }

        console.log(`Parsed ${nodes.size} nodes and ${ways.length} ways`);

        // Transaction to save to DB
        // We will process ways and create edges
        // Note: This can be slow for large datasets. For production, use bulk insert or stream.

        let newNodesCount = 0;
        let newEdgesCount = 0;

        for (const way of ways) {
            const wayNodes = way.nodes as number[];
            if (wayNodes.length < 2) continue;

            // Determine base penalty based on highway type
            let basePenalty = 1.0;
            const hw = way.tags?.highway;
            if (hw === 'motorway' || hw === 'trunk') basePenalty = 0.8; // Fast
            else if (hw === 'primary') basePenalty = 0.9;
            else if (hw === 'residential') basePenalty = 1.2; // Slower
            else if (hw === 'service' || hw === 'track') basePenalty = 1.5;

            for (let i = 0; i < wayNodes.length - 1; i++) {
                const startId = wayNodes[i] as number;
                const endId = wayNodes[i + 1] as number;

                const startNode = nodes.get(startId);
                const endNode = nodes.get(endId);

                if (startNode && endNode) {
                    // Create/Ensure nodes exist
                    const n1 = await prisma.graphNode.upsert({
                        where: { osmId: startId.toString() },
                        create: { osmId: startId.toString(), latitude: startNode.lat, longitude: startNode.lon },
                        update: {},
                    });
                    const n2 = await prisma.graphNode.upsert({
                        where: { osmId: endId.toString() },
                        create: { osmId: endId.toString(), latitude: endNode.lat, longitude: endNode.lon },
                        update: {},
                    });

                    // Distance
                    const dist = turf.distance(
                        turf.point([startNode.lon, startNode.lat]),
                        turf.point([endNode.lon, endNode.lat]),
                        { units: 'meters' }
                    );

                    // Create Edge (One way unless specified? OSM ways are generally one way if oneway=yes, but assuming bidirectional for simplicity for now or creating two edges)
                    // Simplified: Create bidirectional for all for this prototype unless oneway tag is explicit

                    const createEdge = async (fromId: string, toId: string) => {
                        await prisma.graphEdge.create({
                            data: {
                                startNodeId: fromId,
                                endNodeId: toId,
                                distance: dist,
                                baseCost: dist,
                                penalty: basePenalty
                            }
                        });
                        newEdgesCount++;
                    };

                    await createEdge(n1.id, n2.id);
                    // Verify oneway
                    if (way.tags?.oneway !== 'yes') {
                        await createEdge(n2.id, n1.id);
                    }
                }
            }
        }
        console.log(`Ingestion complete. Added edges.`);
        return { success: true, nodes: nodes.size, ways: ways.length };

    } catch (error) {
        console.error("OSM Ingestion Error:", error);
        throw error;
    }
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
    const [allNodes, allEdges, activeIssues] = await Promise.all([
        prisma.graphNode.findMany({
            select: { id: true, latitude: true, longitude: true },
        }),
        prisma.graphEdge.findMany({
            select: { id: true, startNodeId: true, endNodeId: true, distance: true, baseCost: true, penalty: true },
        }),
        prisma.issue.findMany({
            where: { status: { not: IssueStatus.RESOLVED } },
            select: { latitude: true, longitude: true, issueType: true, severity: true }
        })
    ]);

    console.log(`Loaded ${allNodes.length} nodes, ${allEdges.length} edges, and ${activeIssues.length} active issues`);

    // Build node lookup
    const nodeMap = new Map<string, PathNode>();
    for (const node of allNodes) {
        nodeMap.set(node.id, node);
    }

    // Apply dynamic penalties to edges
    // For each issue, find nearby edges (e.g., within 50 meters) and increase their penalty
    const issueRadius = 0.0005; // approx 50m

    // We update the 'penalty' in the edge objects in memory
    for (const issue of activeIssues) {
        // Find nodes near issue
        const nearbyNodes = allNodes.filter(n =>
            Math.abs(n.latitude - issue.latitude) < issueRadius &&
            Math.abs(n.longitude - issue.longitude) < issueRadius
        );
        const nearbyNodeIds = new Set(nearbyNodes.map(n => n.id));

        // Find edges connected to these nodes
        for (const edge of allEdges) {
            if (nearbyNodeIds.has(edge.startNodeId) || nearbyNodeIds.has(edge.endNodeId)) {
                // Increase penalty
                // Severity multiplier: 5 for potholes, 10 for major blockage
                // Defaulting to 5.0 for now
                edge.penalty = (edge.penalty || 1) * 5.0;
            }
        }
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

export default { findPath, ingestOSMData };
